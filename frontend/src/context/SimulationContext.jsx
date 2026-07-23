import React, { createContext, useState, useEffect } from 'react';

export const SimulationContext = createContext();

export function SimulationProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // Load from local storage or set default
  useEffect(() => {
    const savedTheme = localStorage.getItem('lifeline_theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lifeline_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <SimulationContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </SimulationContext.Provider>
  );
}
