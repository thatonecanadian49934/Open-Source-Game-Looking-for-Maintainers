// Powered by OnSpace.AI
import { useContext } from 'react';
import { GameContext, GameContextType } from '@/contexts/GameContext';

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
