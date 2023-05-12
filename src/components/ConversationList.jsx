import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import db from '../config/firebaseConfig';
import PropTypes from 'prop-types';
import { IoIosMenu } from 'react-icons/io';

function ConversationList({ setConversationId, setMessages }) {
  const [conversations, setConversations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const conversationListRef = useRef(null); 

  useEffect(() => {
    const fetchConversations = async () => {
      const q = query(collection(db, 'conversations'), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      const conversationsArray = [];
      querySnapshot.forEach((doc) => {
        conversationsArray.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setConversations(conversationsArray);
    };

    fetchConversations();
  }, []);

  const handleConversationClick = (conversation) => {
    setConversationId(conversation.id);
    const messagesArray = conversation.messages.map((messageObj) => ({
      message: messageObj.userMessage,
      sender: 'user',
      direction: 'outgoing',
    }));
    setMessages(messagesArray);
    setIsOpen(false); // close the menu when a conversation is clicked
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && conversationListRef.current && !conversationListRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`conversation-list ${isOpen ? 'list-open' : 'list-closed'}`} ref={conversationListRef}>
      <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
        <div className={`${isOpen ? 'hide-icon' : ''}`}>
         <IoIosMenu size={24} />
        </div>
       
        <div className={`${isOpen ? 'show-title' : 'hide-title'}`}>Conversation History</div>
      </div>
      {isOpen && conversations.slice().reverse().map((conversation, index) => {
        const firstMessage = conversation.messages[0]?.userMessage || '';
        const previewText = firstMessage.length > 30
          ? `${firstMessage.slice(0, 20)}...`
          : firstMessage;

        return (
          <div
            key={index}
            className="conversation-item"
            onClick={() => handleConversationClick(conversation)}
          >
            {previewText}
          </div>
        );
      })}
    </div>
  );
}

ConversationList.propTypes = {
  setConversationId: PropTypes.func.isRequired,
  setMessages: PropTypes.func.isRequired,
};

export default ConversationList;
