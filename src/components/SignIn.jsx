import { useState } from 'react';
import PropTypes from 'prop-types';
import { BounceLoader } from "react-spinners";
import '../styles.css';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { handleForgotPassword } from './authentication';

const auth = getAuth();

const SignIn = ({ handleSignIn, handleSignInWithEmail, handleSignUpWithEmail }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignInClick = async () => {
    try {
      setLoading(true);
      await handleSignInWithEmail(email, password);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const handleSignUpClick = async () => {
    try {
      setLoading(true);
      await handleSignUpWithEmail(email, password);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await handleSignIn(); // Perform the Google sign-in logic
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const handleForgotPasswordClick = async () => {
    if (!email) {
      setError("Please input your email first.");
      return;
    }
    try {
      const message = await handleForgotPassword(email);
      setError(message);
    } catch (error) {
      setError(error.message);
    }
  };

  

  return (
    <div className="signin-container">
      <h1 className="chat-ai-header">Chat AI</h1>
      {loading ? (
        <BounceLoader 
          type="Puff"
          color={"#007bff"} 
          loading={loading} 
          size={50}
        />
      ) : (
        <>
          {error ? <div><p className="error-message">{error}</p></div> : <div className="blank-error">I am transparent</div>}
          <div className="signin-form">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="signin-input"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="signin-input"
            />
            <div className="auth-buttons">
              <button onClick={handleSignInClick} className="signin-btn auth-btn">
                Sign In
              </button>
              <button onClick={handleSignUpClick} className="signup-btn auth-btn">
                Sign Up
              </button>
            </div>
          </div>
          <button className="google-btn" onClick={handleGoogleSignIn}>
            <img className="google-icon" src="/google_signin_light.png" alt="Google sign-in" />
          </button>
          <div className="forgot-password" onClick={handleForgotPasswordClick}>Forgot Password?</div>
        </>
      )}
    </div>
  );
};

SignIn.propTypes = {
  handleSignIn: PropTypes.func.isRequired,
  handleSignInWithEmail: PropTypes.func.isRequired,
  handleSignUpWithEmail: PropTypes.func.isRequired,
};

export default SignIn;
