// src/components/Auth.tsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // <--- New State
  const navigate = useNavigate();

  const handleAuth = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(''); // Clear previous errors

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMsg(error.message);
      } else {
        navigate('/dashboard');
      }

      return;
    }

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });


    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setErrorMsg('Signup successful! Please check your email to confirm your account.');
    // Do not navigate; user needs to confirm email first
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleAuth} className="auth-form">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        {!isLogin && (
          <>
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </>
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        
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