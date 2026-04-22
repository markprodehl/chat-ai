import { updateDoc, arrayUnion, doc, serverTimestamp } from 'firebase/firestore/lite';
import { db, auth } from '/src/config/firebaseConfig.js';

const parseResponseText = (data) =>
  data.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === 'output_text')
    ?.map((item) => item.text)
    ?.join('') || '';

const saveConversationResponse = async (chatMessages, conversationId, responseText) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('Error: User not authenticated.');
    return;
  }

  const userId = currentUser.uid;
  const userRef = doc(db, 'users', userId);
  const conversationRef = doc(userRef, 'conversations', conversationId);
  const userMessage = chatMessages[chatMessages.length - 1]?.message || '';

  await updateDoc(conversationRef, {
    userId: userId,
    messages: arrayUnion({
      userMessage: userMessage,
      aiResponse: responseText,
    }),
    lastUpdated: serverTimestamp(),
  });

  document.dispatchEvent(new CustomEvent('update-conversation'));
};

const readStreamedResponse = async (response, setTypingText) => {
  if (!response.body) {
    throw new Error('OpenAI response body is not readable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamedText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventChunk of events) {
      const lines = eventChunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const rawData = line.slice(5).trim();
        if (!rawData || rawData === '[DONE]') {
          continue;
        }

        const eventData = JSON.parse(rawData);

        if (eventData.type === 'response.output_text.delta') {
          streamedText += eventData.delta || '';
          setTypingText(streamedText);
          continue;
        }

        if (eventData.type === 'response.completed' && !streamedText) {
          streamedText = parseResponseText(eventData.response || {});
          setTypingText(streamedText);
        }

        if (eventData.type === 'error') {
          throw new Error(eventData.error?.message || 'OpenAI streaming request failed.');
        }
      }
    }
  }

  return streamedText.trim();
};

const processMessageToChatGPT = async (
  chatMessages,
  VITE_MY_OPENAI_API_KEY,
  VITE_OPENAI_MODEL,
  VITE_OPENAI_REASONING_EFFORT,
  systemMessageText,
  setMessages,
  setTyping,
  setTypingText, 
  conversationId
) => {
  // chatMessages looks like this { sender: "user" or "ChatGPT", message: "The message content here"}
  // To send messages to the API we need to make a new API Array, which needs to be in this format for the frontend { role: "user", or "assistant", content: "The message content here" }
  // To format the API data we can build a new array by mapping through the all of the chatMessages and create a new object
  let apiMessages = chatMessages.map((messageObject) => {
    // Initialize role as an empty string
    let role = '';
    if (messageObject.sender === 'ChatGPT') {
      role = 'assistant';
    } else {
      role = 'user';
    }
    return { role: role, content: messageObject.message };
  });

  if(!systemMessageText) {
    console.error('systemMessage undefined')
    setTyping(false);
    setMessages([
      ...chatMessages,
      {
        message: 'System message is missing. Please refresh and try again.',
        sender: 'ChatGPT',
        direction: 'incoming',
      },
    ]);
    return
  }

  // Responses API is the supported path for GPT-5 family models.
  const apiRequestBody = {
    model: VITE_OPENAI_MODEL,
    instructions: systemMessageText,
    input: apiMessages,
    store: false,
    stream: true,
  };

  if (VITE_OPENAI_MODEL.startsWith('gpt-5') || VITE_OPENAI_MODEL.startsWith('o')) {
    const defaultEffort = VITE_OPENAI_MODEL.includes('-pro') ? 'medium' : 'low';
    apiRequestBody.reasoning = {
      effort: VITE_OPENAI_REASONING_EFFORT || defaultEffort,
    };
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + VITE_MY_OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequestBody),
    });

    if (!response.ok) {
      const errorInfo = await response.json().catch(() => null);
      console.error('Error info:', errorInfo);
      const errorMessage = errorInfo?.error?.message || `OpenAI request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const responseText = await readStreamedResponse(response, setTypingText);

    if (!responseText) {
      throw new Error('OpenAI returned an empty response.');
    }

    setTypingText('');
    setTyping(false);
    setMessages([
      ...chatMessages,
      {
        message: responseText,
        sender: 'ChatGPT',
        direction: 'incoming',
      },
    ]);

    await saveConversationResponse(chatMessages, conversationId, responseText);
  } catch (error) {
    console.error('Network Error:', error);
    setTypingText('');
    setTyping(false);
    setMessages([
      ...chatMessages,
      {
        message: `Unable to get a response: ${error.message}`,
        sender: 'ChatGPT',
        direction: 'incoming',
      },
    ]);
  }
 };

export default processMessageToChatGPT;
  
  
