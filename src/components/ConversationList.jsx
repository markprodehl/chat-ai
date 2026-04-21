import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, orderBy, doc, writeBatch } from 'firebase/firestore/lite';
import { db, auth } from '/src/config/firebaseConfig.js';
import PropTypes from 'prop-types';
import { IoIosMenu } from 'react-icons/io';
import { IoTrashOutline } from 'react-icons/io5';
import personalityOptions from './PersonalityOptions';
function ConversationList({
  setConversationId,
  setMessages,
  handleSignOut,
  systemMessageText,
  setSystemMessageText
}) {
  const [conversations, setConversations] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [deletionMode, setDeletionMode] = useState(false);
  const [deleteIconColor, setDeleteIconColor] = useState('');
  const [selectedConversations, setSelectedConversations] = useState([]);
  const conversationListRef = useRef(null);

  const fetchConversations = async () => {
    const user = auth.currentUser;
    if (user) {
      const userId = user.uid;
      setUserEmail(user.email);
      const userRef = doc(db, 'users', userId);
      const q = query(
        collection(userRef, 'conversations'),
        orderBy('lastUpdated', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const conversationsArray = [];
      querySnapshot.forEach((doc) => {
        conversationsArray.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setConversations(conversationsArray);
    } 
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchConversations();
      }
    });

    const updateConversationListener = () => {
      fetchConversations();
    };

    // Listen to the 'update-conversation' event
    document.addEventListener('update-conversation', updateConversationListener);

    return () => {
      unsubscribeAuth();
      // Remove the event listener when the component unmounts
      document.removeEventListener('update-conversation', updateConversationListener);
    };
  }, []);

  const handleConversationClick = (conversation) => {
    setConversationId(conversation.id);

    const messagesArray = conversation.messages.flatMap((messageObj) => [
      {
        message: messageObj.userMessage,
        sender: 'user',
        direction: 'outgoing',
      },
      {
        message: messageObj.aiResponse,
        sender: 'ChatGPT',
        direction: 'incoming',
      },
    ]);

    setMessages(messagesArray);
    setIsOpen(false); // close the menu when a conversation is clicked
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen && 
        conversationListRef.current && 
        !conversationListRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setDeletionMode(false);
        setDeleteIconColor('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCheckboxChange = (event, conversationId) => {
    event.stopPropagation();
    if (event.target.checked) {
      setSelectedConversations([...selectedConversations, conversationId]);
    } else {
      setSelectedConversations(selectedConversations.filter(id => id !== conversationId));
    }
  };

  useEffect(() => {
    // Update the delete icon color based on the selected conversations
    setDeleteIconColor(selectedConversations.length > 0 ? 'delete-icon-green' : '');
  }, [selectedConversations]);

  const handleDeleteConversations = (event) => {
    event.stopPropagation(); // This will prevent the click event from bubbling up
    if (deletionMode) {
      executeDeletion();
    }
    setDeletionMode(!deletionMode);
    setDeleteIconColor(selectedConversations.length > 0 ? 'delete-icon-green' : '');
  };

  const executeDeletion = async () => {
    // Turn off deletion mode and delete the selected conversations
    setSelectedConversations([]);

    const user = auth.currentUser;
    if (user) {
      const userId = user.uid;
      const userRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      for (let i = 0; i < selectedConversations.length; i++) {
        const conversationRef = doc(userRef, 'conversations', selectedConversations[i]);
        batch.delete(conversationRef);
      }

      try {
        await batch.commit();
        console.log('Deleted successfully');
        // Fetch the conversations after successful deletion
        await fetchConversations();
      } catch (error) {
        console.error('Error deleting conversations: ', error);
      }
    }
    setDeleteIconColor('');
  };


  return (
    <div className={`conversation-list ${isOpen ? 'list-open' : 'list-closed'}`} ref={conversationListRef}>
      <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
        <div className={`${isOpen ? 'hide-icon' : ''}`}>
          <IoIosMenu size={24} />
        </div>
      </div>
  
      {isOpen && (
        <>
          <details className="dropdown">
          <summary>Conversation History</summary>
            <IoTrashOutline
              className={`delete-icon ${deleteIconColor}`}
              onClick={handleDeleteConversations}
            />
            {conversations.slice().map((conversation, index) => {
              const firstMessage = conversation.messages[0]?.userMessage || '';
              const previewText = firstMessage.length > 30
                ? `${firstMessage.slice(0, 20)}...`
                : firstMessage;
  
              return (
                <div
                  key={index}
                  className="conversation-item"
                  onClick={() => !deletionMode && handleConversationClick(conversation)}
                >
                  {previewText}
                  {deletionMode && (
                    <input
                      type="checkbox"
                      className="checkbox"
                      onChange={(event) => handleCheckboxChange(event, conversation.id)}
                    />
                  )}
                </div>
              );
            })}
          </details>
          
          <details className="dropdown">
            <summary>Personality Settings</summary>
            {personalityOptions.map((option, index) => (
              <div
                key={index}
                className={`conversation-item ${systemMessageText === option.value ? 'selected-option' : ''}`}
                onClick={() => {
                  setSystemMessageText(option.value);
                  setIsOpen(false); // Close the menu after selecting an option
                }}
              >
                {option.label}
                {systemMessageText === option.value ? ' *' : ''}
              </div>
            ))}
          </details>
  
          <div className="dropdown sign-out" onClick={handleSignOut}>
            Sign Out  {userEmail}
          </div>
        </>
      )}
    </div>
  );
}

ConversationList.propTypes = {
  setConversationId: PropTypes.func.isRequired,
  setMessages: PropTypes.func.isRequired,
  handleSignOut: PropTypes.func.isRequired, // Add handleSignOut prop
  systemMessageText: PropTypes.string.isRequired,
  setSystemMessageText: PropTypes.func.isRequired,
};

export default ConversationList;
