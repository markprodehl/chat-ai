import { updateDoc, arrayUnion, doc, serverTimestamp } from 'firebase/firestore/lite';
import { db, auth } from '/src/config/firebaseConfig.js';

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
  };

  if (VITE_OPENAI_MODEL.startsWith('gpt-5') || VITE_OPENAI_MODEL.startsWith('o')) {
    const defaultEffort = VITE_OPENAI_MODEL.includes('-pro') ? 'medium' : 'low';
    apiRequestBody.reasoning = {
      effort: VITE_OPENAI_REASONING_EFFORT || defaultEffort,
    };
  }
  
  await fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    headers: {
      Authorization: 'Bearer ' + VITE_MY_OPENAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiRequestBody),
  })
  // Now we need to grab the data being returned from OpenAI
  .then((response) => {
    if (!response.ok) {
      // The request failed, let's get more information
      return response.json().then((errorInfo) => {
        console.error('Error info:', errorInfo);
        const errorMessage = errorInfo?.error?.message || `OpenAI request failed with status ${response.status}`;
        throw new Error(errorMessage);
      });
    }
    return response.json();
  })

  // USe this if you dont want the typing effect
  // .then((data) => {
  //   // Log to show the structure of the response in the console
  // console.log(data.choices[0].message.content)
  //  // Now we need to show this message to our user in the UI using the setMessages function
  //   setMessages([
  //     ...chatMessages,
  //     {
  //       message: data.choices[0].message.content,
  //       sender: 'ChatGPT',
  //     },
  //   ]);
  //    // Once we get the response we need to setTyping to false again
  //   setTyping(false);
  // });

  // To add the TYPING EFFECT use this

  .then(async (data) => {
    const responseText = data.output
      ?.flatMap((item) => item.content || [])
      ?.filter((item) => item.type === 'output_text')
      ?.map((item) => item.text)
      ?.join('') || '';

    if (!responseText) {
      throw new Error('OpenAI returned an empty response.');
    }

    // Show the typing text one character at a time
    let typingTimeout = 0.5; // You can adjust the typing speed by changing this value
    
    await responseText.split('').reduce((acc, char) => {
      // Use the reduce function to iterate through each character in the response text
      return acc.then(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            setTypingText((prevTypingText) => prevTypingText + char);
            resolve();
          }, typingTimeout); // Set the typing delay based on the typingTimeout
        });
      });
    }, Promise.resolve());

    setTypingText('');
    setTyping(false);

    setTimeout(async () => {
      setMessages([
        ...chatMessages,
        {
          message: responseText,
          sender: 'ChatGPT',
          direction: 'incoming',
        },
      ]);

      // Save the conversation history to Firestore
      const currentUser = auth.currentUser; // Initialize currentUser at the beginning
      if (currentUser) {
        const userId = currentUser.uid;
        const userRef = doc(db, 'users', userId); // Get the document reference to the current user
        const conversationRef = doc(userRef, 'conversations', conversationId); // Get the reference to the conversation document under the current user
        const userMessage = chatMessages[chatMessages.length - 1]?.message || '';
        const aiResponse = responseText || '';

        await updateDoc(conversationRef, {
          userId: userId,
          messages: arrayUnion({
            userMessage: userMessage,
            aiResponse: aiResponse,
          }),
          lastUpdated: serverTimestamp(),
        });

        // Emit a custom event right after the conversation document is updated to update the history
        document.dispatchEvent(new CustomEvent('update-conversation'));
      } else {
        console.error('Error: User not authenticated.');
      }
    });
  })
  .catch((error) => {
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
  })
 };

export default processMessageToChatGPT;
  
  
