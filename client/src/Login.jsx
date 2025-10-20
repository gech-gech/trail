import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

 // In your Login component
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Log the data to see what's being returned
      console.log('Login response:', data);
      
      // Store the complete user object including the token
      localStorage.setItem('user', JSON.stringify({
        _id: data.user.id,
        name: data.user.name,
        photo: data.user.photo,
        token: data.token // Make sure token is stored
      }));
      
      navigate('/home');
    } else {
      setError(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    setError('An error occurred during login');
  }
};


  return (
    <div className="login-container">
      <div className="login-header">
        <h2>Welcome Back!</h2>
        <p>Please enter your credentials</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleLogin} className="login-form">
        <div className="input-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Enter your email" 
            required 
          />
        </div>
        
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter your password" 
            required 
          />
        </div>
        
        <button type="submit" className="login-btn">Login</button>
        
        <div className="login-footer">
          <p>Don't have an account? <a href="/signup">Sign up</a></p>
        </div>
      </form>
    </div>
  );
};

export default Login;
