# ChatAI Application

ChatAI is an application developed using React and Vite. It uses Firebase Firestore for data storage and Google Authentication for user identification. This application is hosted on Google hosting. The application interacts with OpenAI models for creating conversational agents.

Link to the deployed application - https://chat-ai-c95f1.web.app/

## Features

- Google Authentication
- Chat interface with real-time messages
- Typing effect for the AI assistant
- Hard coded message content formatter
- SyntaxHighlighter that formats code into readable snippets
- System message that defines AI assistant's behavior
- Data storage in Firestore DB

## Main Libraries Used

- React
- Vite
- Firebase Firestore
- Google Authentication
- Font-awesome
- SyntaxHighlighter

## Installation

- Make sure you have `Node.js` and `npm` installed.
- Set up Google Firebase - Refer to the Firebase Quickstart Guide https://firebase.google.com/docs/hosting/quickstart
- Have Firebase Authentication enabled.

1. Clone this repository:

    ```
    git clone https://git@github.com:markprodehl/chat-ai.git
    ```

2. Change into the directory:

    ```
    cd chat-ai
    ```

3. Install all dependencies:

    ```
    npm install
    ```

4. Create a new file `.env` in the root directory. You will store all your environment variables in this file. Note that the `VITE` naming convention must be applied:
**IMPORTANT**: Do not commit or share these secrets publicly. Always include `.env` in your `.gitignore` file.

    ```
    VITE_MY_OPENAI_API_KEY=<your_openai_key_here>
    VITE_OPENAI_MODEL=gpt-5.4-mini
    VITE_OPENAI_REASONING_EFFORT=low
    VITE_FIREBASE_API_KEY=<your_firebase_api_key_here>
    VITE_AUTH_DOMAIN=<your_auth_domain_here>
    VITE_PROJECT_ID=<your_project_id_here>
    VITE_STORAGE_BUCKET=<your_storage_bucket_here>
    VITE_MESSAGE_SENDER_ID=<your_message_sender_id_here>
    VITE_APP_ID=<your_app_id_here>
    VITE_MEASUREMENT_ID=<your_measurement_id_here>

    ```

5. Run the application:

    ```
    npm run dev
    ```

## Usage

After signing in with Google, users can start a conversation with the AI. Each user's message is sent to an OpenAI model, which returns a response that is displayed on the user's screen.

The AI can simulate a 'typing' effect before it displays its message, providing a more conversational feel to the application.

Users can also adjust the AI's 'personality' using a system message that sets the tone for the AI's responses.

## File Structure

The application consists of several main components:

- `ChatAI`: The main chat interface.
- `SignIn`: Handles user authentication.
- `ConversationList`: Displays a list of all conversations.
- `ProcessMessageToChatGPT`: Processes messages and sends them to GPT-3 for response generation.
- `PersonalityOptions`: Contains options for setting the AI's 'personality'.
- `authentication.js`: Handles sign in and sign out operations.
- `firebaseConfig.js`: Contains configuration details for Firestore and Firebase Authentication.

## Contributing

Contributions are welcome! Please fork this repository and open a pull request to add enhancements or bug fixes.

## License

This project is open-sourced under the MIT License.
