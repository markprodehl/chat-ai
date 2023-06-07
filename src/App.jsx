import React from 'react'
import { useState, useRef, useEffect } from 'react';
import './styles.css';
import 'font-awesome/css/font-awesome.min.css';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { twilight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // choose the style you prefer
import 'react-syntax-highlighter/dist/esm/styles/prism/solarizedlight';

import processMessageToChatGPT from './components/ProcessMessageToChatGPT';
import ConversationList from './components/ConversationList';
import { signIn, signInWithEmail, signUpWithEmail, signOut } from './components/authentication';
import SignIn from './components/SignIn';

import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './config/firebaseConfig';

function ChatAI() {
  const VITE_MY_OPENAI_API_KEY = import.meta.env.VITE_MY_OPENAI_API_KEY;
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [systemMessageText, setSystemMessageText] = useState('');
  const [messages, setMessages] = useState([
    {
      message: 'Hello, I am your AI assistant. Feel free to ask me anything.',
      sender: 'ChatGpt',
      direction: 'incoming',
    },
  ]); // []
  const [conversationId, setConversationId] = useState(null);
  const messageListRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      
      if (user) {
        // Fetch the user's document from Firestore
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          // Get the data from the user's document
          const userData = docSnap.data();
          
          setUser(user);
          // Set systemMessageText from the user's document data
          setSystemMessageText(userData.systemMessageText);
        } else {
          console.log('No user document found!');
        }
      } else {
        setUser(null);
        setSystemMessageText("Explain all concepts like I am 10 years old."); // reset systemMessageText to default
      }
      setLoading(false); // Once the initial authentication state is determined, set loading to false
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Save systemMessageText to Firestore when it changes
  useEffect(() => {
    const saveSystemMessageText = async () => {
      if (user && systemMessageText !== user.systemMessageText) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            systemMessageText: systemMessageText,
          });
        } catch (error) {
          console.error('Error saving systemMessageText:', error);
        }
      }
    };

    saveSystemMessageText();
  }, [systemMessageText, user]);

  const handleSignIn = async () => {
    const user = await signIn();
    setUser(user);
  };

  const handleSignInWithEmail = async (email, password) => {
    const user = await signInWithEmail(email, password);
    setUser(user);
  };

  const handleSignUpWithEmail = async (email, password) => {
    const user = await signUpWithEmail(email, password);
    setUser(user);
  };    

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  useEffect(() => {
    const fetchConversation = async (conversationId) => {
      if (!conversationId) {
        console.error("Error: conversationId is undefined.");
        return;
      }
      try {
        const user = auth.currentUser;
        if (user) {
          const userId = user.uid;
          const docRef = doc(db, 'users', userId );
          const docSnap = await getDoc(docRef);
    
          if (docSnap.exists()) {
            const docData = docSnap.data();
            if (docData && docData.messages) {
              setMessages(
                docData.messages.map((messagePair) => [
                  { sender: 'user', message: messagePair.userMessage, direction: 'outgoing' },
                  { sender: 'ChatGPT', message: messagePair.aiResponse, direction: 'incoming' },
                ]).flat()
              );
            } else {
              console.log("No messages found in the conversation.");
            }
          } else {
            console.log("No such document!");
          }
        } else {
          console.error("Error: auth.currentUser is null.");
        }
      } catch (e) {
        console.error("Error fetching conversation: ", e);
      }
    };
  
    if (conversationId) {
      fetchConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    const createNewConversation = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userId = user.uid;
          const userRef = doc(db, 'users', userId); // Get the document reference to the current user
          const newConversationRef = await addDoc(collection(userRef, 'conversations'), {
            createdAt: serverTimestamp(),
          });
          setConversationId(newConversationRef.id);
        }
      } catch (e) {
        console.error('Error creating new conversation: ', e);
      }
    };
  
    if (user && systemMessageText) {
      createNewConversation();
    }
  }, [user, systemMessageText]);
 
  const handleSend = async (message) => {
    const newMessage = {
      message: message,
      sender: 'user',
      direction: 'outgoing'
    };

    const newMessages = [...messages, newMessage] // By adding all of the messages and the newMessage this will allow ChatGPT to keep context of teh conversation
    // Update the message state
    setMessages(newMessages);
    // Set a typing indicator (AI Processing)
    setTyping(true);
    // if(!systemMessageText) {
    //   console.log("In handlesend system message is undefined", systemMessageText)
    // }
    // Process the message to chatgpt (send it over the response) with all the messages from our chat so that the context of the conversation is maintained
    if (conversationId) { // Check if conversationId is defined before calling processMessageToChatGPT
      await processMessageToChatGPT(
        newMessages,
        VITE_MY_OPENAI_API_KEY,
        systemMessageText,
        setMessages,
        setTyping,
        setTypingText,
        conversationId
      );
    }
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleButtonClick = () => {
    const inputElement = document.querySelector('.message-input');
    handleSend(inputElement.value);
    inputElement.value = '';
  };

  const formatMessageContent = (content, isOutgoing) => {
    const lines = content.split('\n');
  
    let formattedLines = [];
    let listType = null;
    let listItems = [];
  
    const processList = () => {
      if (listItems.length > 0) {
        if (listType === 'bullet') {
          return <ul key={formattedLines.length}>{listItems.map((item, index) => <li key={index}>{item}</li>)}</ul>;
        } else if (listType === 'numbered') {
          return <ol key={formattedLines.length}>{listItems.map((item, index) => <li key={index}>{item}</li>)}</ol>;
        }
      }
      return null;
    };
  
    const formatInlineCode = (line) => {
      const parts = line.split('`');
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return <code className="inline-code"key={index}>{part}</code>;
        }
        return part;
      });
    };
  
    lines.forEach((line) => {
      const trimmedLine = line.trim();
  
      if (trimmedLine.startsWith('- ')) {
        if (listType === 'numbered') {
          formattedLines.push(processList());
          listItems = [];
          listType = null;
        }
  
        if (!listType || listType === 'bullet') {
          listType = 'bullet';
          listItems.push(trimmedLine.slice(2));
        } else {
          formattedLines.push(line);
        }
      } else if (trimmedLine.match(/^\d+\./)) {
        if (listType === 'bullet') {
          formattedLines.push(processList());
          listItems = [];
          listType = null;
        }
  
        if (!listType || listType === 'numbered') {
          listType = 'numbered';
          listItems.push(trimmedLine.slice(trimmedLine.indexOf('.') + 2));
        } else {
          formattedLines.push(line);
        }
      } else {
        const formattedLine = formatInlineCode(line);
        formattedLines.push(
          <p className={`paragraph ${isOutgoing ? 'message-outgoing-bubble' : ''}`} key={formattedLines.length}>
            {formattedLine}
          </p>
        );
        if (listType) {
          formattedLines.push(processList());
          listItems = [];
          listType = null;
        }
      }
    });
  
    if (listType) {
      formattedLines.push(processList());
    }
  
    return formattedLines.map((line, index) => <div key={index}>{line}</div>);
  };
  
  return (
    <div className="chat-ai">
      {!loading && !user &&  <SignIn handleSignIn={handleSignIn} handleSignInWithEmail={handleSignInWithEmail} handleSignUpWithEmail={handleSignUpWithEmail} />}
      {user && (
        <>
          <ConversationList
            setConversationId={setConversationId}
            setMessages={setMessages}
            handleSignOut={handleSignOut}
            systemMessageText={systemMessageText}
            setSystemMessageText={setSystemMessageText}
            />
          <div className="chat-container" style={{ overflowY: 'scroll' }} ref={messageListRef}>
            <div className="message-list-container">
              <div className="message-list">
                {messages.map((message, i) => {
                  const messageParts = message.message.split('```');
                  return (
                    <div
                      key={i}
                      className={`message ${
                        message.direction === 'incoming' ? 'message-incoming' : 'message-outgoing'
                      }`}
                    >
                      {messageParts.map((messagePart, j) => {
                        const isCodeSnippet = j % 2 === 1;
                        if (isCodeSnippet) {
                          const codeLanguage = messagePart.split('\n')[0];
                          const codeSnippet = messagePart.replace(codeLanguage + '\n', '');

                          return (
                            <SyntaxHighlighter
                              className="highlighter"
                              language={codeLanguage || 'javascript'}
                              style={twilight}
                              key={`${i}-${j}`}
                            >
                              {codeSnippet}
                            </SyntaxHighlighter>
                          );
                        } else {
                          return formatMessageContent(messagePart, message.direction === 'outgoing');
                        }
                      })}
                    </div>
                  );
                })}
                {typing && (
                  <div className="message message-incoming typing-indicator typing-animation">
                    AI processing: <span>{typingText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="message-input-container">
            <input
              className="message-input"
              type="text"
              placeholder="Type message here"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              className="send-button"
              onClick={handleButtonClick}
            >
              <i className="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
          </div>
          
          {/* To display the personality options select at the bottom of the view */}
          {/* <div className="system-message-container">
            <label htmlFor="system-message-input">Personality: </label>
            <select
              id="system-message-selection"
              value={systemMessageText}
              onChange={(e) => setSystemMessageText(e.target.value)}
            >
              {personalityOptions.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div> */}
        </>
      )}
    </div>
  );
}

export default ChatAI
