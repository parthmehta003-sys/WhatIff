import { createContext } from 'react';

export const ThemeContext = createContext<'dark' | 'light'>('light');
