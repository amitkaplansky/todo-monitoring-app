import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  // Todos
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  // Add debug logging
  console.log('App render - user:', user, 'token:', token);

  useEffect(() => {
    console.log('useEffect triggered with token:', token);
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
      fetchTodos();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile...');
      const response = await axios.get(`${API_URL}/api/profile`);
      console.log('Profile response:', response.data);
      setUser(response.data.user);
    } catch (error) {
      console.error('Profile fetch error:', error);
      logout();
    }
  };

  const fetchTodos = async () => {
    try {
      console.log('Fetching todos...');
      const response = await axios.get(`${API_URL}/api/todos`);
      console.log('Todos response:', response.data);
      setTodos(response.data.todos);
    } catch (error) {
      console.error('Todos fetch error:', error);
      setError('Failed to load todos');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isRegister) {
        console.log('Attempting registration...');
        await axios.post(`${API_URL}/api/register`, { username, email, password });
        setSuccess('Registration successful! Please login.');
        setIsRegister(false);
      } else {
        console.log('Attempting login...');
        const response = await axios.post(`${API_URL}/api/login`, { username, password });
        console.log('Login response:', response.data);
        
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        
        // Check if user data is in login response
        if (response.data.user) {
          console.log('Setting user from login response:', response.data.user);
          setUser(response.data.user);
        } else {
          console.log('No user data in login response, will fetch from profile');
        }
      }
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.response?.data?.error || 'Authentication failed');
    }
  };

  const logout = () => {
    console.log('Logging out...');
    setToken(null);
    setUser(null);
    setTodos([]);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const createTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await axios.post(`${API_URL}/api/todos`, { 
        title: newTodo,
        priority: 'medium'
      });
      setNewTodo('');
      fetchTodos();
      setSuccess('Todo created');
    } catch (error) {
      setError('Failed to create todo');
    }
  };

  const updateTodoStatus = async (todoId, status) => {
    try {
      await axios.put(`${API_URL}/api/todos/${todoId}`, { status });
      fetchTodos();
    } catch (error) {
      setError('Failed to update todo');
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      await axios.delete(`${API_URL}/api/todos/${todoId}`);
      fetchTodos();
    } catch (error) {
      setError('Failed to delete todo');
    }
  };

  // Login/Register Form
  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h1>Todo App</h1>
        
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}
        
        <form onSubmit={handleAuth}>
          <h2>{isRegister ? 'Register' : 'Login'}</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Username:</label><br />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          
          {isRegister && (
            <div style={{ marginBottom: '10px' }}>
              <label>Email:</label><br />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
          )}
          
          <div style={{ marginBottom: '10px' }}>
            <label>Password:</label><br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          
          <button type="submit" style={{ padding: '10px 20px' }}>
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        
        <p>
          {isRegister ? 'Have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <strong>Demo Account:</strong><br />
          Username: admin<br />
          Password: admin123
        </div>
        
        {/* Debug info */}
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0e0e0', fontSize: '12px' }}>
          <strong>Debug Info:</strong><br />
          User: {user ? 'Set' : 'Not set'}<br />
          Token: {token ? 'Present' : 'Missing'}<br />
          Check browser console for detailed logs
        </div>
      </div>
    );
  }

  // Todo Dashboard
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Todo List - {user.username}</h1>
        <button onClick={logout} style={{ padding: '5px 10px' }}>Logout</button>
      </div>
      
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}
      
      {/* Create Todo */}
      <form onSubmit={createTodo} style={{ marginBottom: '30px' }}>
        <h2>Add New Todo</h2>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Enter todo title"
          style={{ width: '70%', padding: '5px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '5px 15px' }}>Add Todo</button>
      </form>
      
      {/* Todo List */}
      <h2>My Todos ({todos.length})</h2>
      {todos.length === 0 ? (
        <p>No todos yet. Add one above!</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Priority</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {todos.map((todo) => (
              <tr key={todo.id}>
                <td style={{ padding: '10px' }}>{todo.title}</td>
                <td style={{ padding: '10px' }}>
                  <select
                    value={todo.status}
                    onChange={(e) => updateTodoStatus(todo.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td style={{ padding: '10px' }}>{todo.priority}</td>
                <td style={{ padding: '10px' }}>
                  {new Date(todo.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    style={{ padding: '2px 8px', backgroundColor: 'red', color: 'white' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;