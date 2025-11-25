import { useState } from 'react';

export const useKanbanSelection = () => {
  const [selectedCard, setSelectedCard] = useState(null); // Pro highlight a ActionBar

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const clearSelection = () => {
    setSelectedCard(null);
  };

  return {
    selectedCard,
    handleCardClick,
    clearSelection,
  };
};
