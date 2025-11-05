import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [backendUrl, setBackendUrl] = useState("");

  // Get backend URL based on frontend URL (same as in Signup)
  useEffect(() => {
    const currentUrl = window.location.href;
    console.log("Frontend URL:", currentUrl);
    
    if (currentUrl.includes('github.dev') || currentUrl.includes('app.github.dev')) {
      // Extract the base URL and change port to 5000
      const url = new URL(currentUrl);
      const baseName = url.hostname.split('-5173')[0]; // Remove the -5173 part
      const backendUrl = `https://${baseName}-5000.app.github.dev`;
      setBackendUrl(backendUrl);
      console.log("Backend URL:", backendUrl);
    } else {
      setBackendUrl("http://localhost:5000");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!backendUrl) {
      setError("⏳ Please wait, detecting server...");
      return;
    }

    try {
      console.log("Logging in to:", `${backendUrl}/login`);
      
      const response = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Login successful:', data);
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify({
          _id: data.user.id,
          name: data.user.name,
          photo: data.user.photo,
          token: data.token
        }));

        // Store token separately for easy access
        localStorage.setItem('token', data.token);
        
        setError(""); // Clear any previous errors
        navigate('/home');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Cannot connect to server. Please try again.');
    }
  };

  // Test backend connection (optional)
  const testConnection = async () => {
    if (!backendUrl) return;
    
    try {
      const response = await fetch(`${backendUrl}/api`);
      const data = await response.json();
      console.log("Backend connection test:", data);
    } catch (error) {
      console.error("Backend connection test failed:", error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h2>Welcome Back!</h2>
        <p>Please enter your credentials</p>
      </div>
      
      {error && (
        <div className={`error-message ${error.includes('✅') ? 'success-message' : ''}`}>
          {error}
        </div>
      )}
      
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
        
        <button type="submit" className="login-btn">
          Login
        </button>
        
        <div className="login-footer">
          <p>Don't have an account? <a href="/signup">Sign up</a></p>
        </div>
      </form>

      {/* Debug info - you can remove this in production */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: '#f5f5f5', 
        borderRadius: '5px',
        fontSize: '12px',
        color: '#666'
      }}>
        <p><strong>Debug Info:</strong></p>
        <p>Backend: {backendUrl || 'Detecting...'}</p>
        <button 
          onClick={testConnection}
          style={{ 
            padding: '5px 10px', 
            fontSize: '10px',
            marginTop: '5px'
          }}
        >
          Test Connection
        </button>
      </div>
    </div>
  );
};

export default Login;