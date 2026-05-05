
import React, { createContext, useContext, useState } from 'react';

interface WorkoutContextType {
  activeWorkout: any | null;
  setActiveWorkout: (workout: any) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<any | null>(null);

  return (
    <WorkoutContext.Provider value={{ activeWorkout, setActiveWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout deve ser usado dentro de WorkoutProvider');
  }
  return context;
};
