// src/components/Auth.tsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // <--- New State
  const navigate = useNavigate();

  const handleAuth = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(''); // Clear previous errors

    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setErrorMsg(error.message); // Set red text instead of alert
    } else if (isLogin) {
      navigate('/dashboard');
    } else {
      setErrorMsg('Check your email for confirmation!');
    }
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleAuth} className="auth-form">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
        
        {/* RED ERROR TEXT */}
        {errorMsg && <p className="error-text">{errorMsg}</p>}
        
        <button type="submit">{isLogin ? 'Login' : 'Join the Hood'}</button>
        <p onClick={() => setIsLogin(!isLogin)} className="toggle-link">
          {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
        </p>
      </form>
    </div>
  );
}