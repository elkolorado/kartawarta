import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from '@/hooks/useAuth';
import { CARDS_API_ENDPOINT } from '@/constants/apiConfig';
import { CardMarketCard } from '@/components/foundCardDetails';
import { fetchCardsWithPrices } from '@/actions/cardsApi';

// Combined type: CardMarketCard fields plus minimal user-collection fields returned by backend
export type CollectionItem = CardMarketCard & {
    // user collection fields (from uc.*)
    user_collection_id?: number; // uc.id as returned by backend
    user_id?: number;
    card_id?: number; // underlying Card.id
    quantity: number;
    quantity_foil?: number;
    collection_last_updated?: string; // uc.last_updated
    expansion_name?: string; // from join with expansions table
    expansion_code?: string; // from join with expansions table
    release_date?: string; // from join with expansions table
};

interface CardContextProps {
    cardCollectionData: CollectionItem[];
    allCards: CollectionItem[];
    fetchAllCardsForTcg: (tcg_id?: number) => Promise<void>;
    addCard: (newCard: CardMarketCard, quantity?: number, quantity_foil?: number) => Promise<number | null>;
    updateCardQuantity: (cardMarketId: number, quantity: number) => Promise<void>;
    fetchCollection: (tcg_id?: number) => Promise<void>;
    removeCard: (cardMarketId: number, quantity?: number, quantity_foil?: number) => Promise<void>;
    tcgName: string;
    setTcgName: (name: string) => void;
    tcgId: number | null;
    setTcgId: (id: number | null) => void;
}

const CardContext = createContext<CardContextProps | undefined>(undefined);

export default CardContext;

export const CardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cardData, setCardData] = useState<CollectionItem[]>([]);
    const [allCards, setAllCards] = useState<CollectionItem[]>([]);
    const [tcgName, setTcgName] = useState<string>('DragonBallSuper');
    const [tcgId, setTcgId] = useState<number | null>(null);
    const { session } = useSession();

    // Fetch the collection from the backend
    const fetchCollection = async (tcg_id?: number) => {
        try {
            const url = new URL(`${CARDS_API_ENDPOINT}/collection/`);
            if (tcg_id) url.searchParams.set('tcg_id', String(tcg_id));
            const response = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${session}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch collection');
            }
            const data = await response.json();
            // Assume backend returns array of rows matching the SQL described by the user
            setCardData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching collection:', error);
        }
    };

    // Fetch all cards for tcg
    const fetchAllCardsForTcg = async () => {
        const cards = await fetchCardsWithPrices(tcgName);
        setAllCards(cards);
    };

    // Add a card to the backend collection
    const addCard = async (newCard: CardMarketCard, quantity = 1, quantity_foil = 0) => {
        try {
            // Prefer sending `card_market_id` from the CardMarketCard we get in the app
            const body: any = { quantity, quantity_foil };
            if (typeof newCard.cardMarketId === 'number') {
                body.card_market_id = newCard.cardMarketId;
            } else if (typeof newCard.card_id === 'number') {
                body.card_id = newCard.card_id;
            } else {
                // As a last resort try id field
                const parsed = Number((newCard as any).id);
                if (!Number.isNaN(parsed) && Number.isFinite(parsed)) body.card_id = parsed;
            }

            const response = await fetch(`${CARDS_API_ENDPOINT}/collection/addCard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Failed to add card');
            }
            const json = await response.json();
            // backend returns { success: True, user_collection_id: uc_id }
            const ucId = json?.user_collection_id ?? null;
            await fetchCollection();
            return ucId;
        } catch (error) {
            console.error('Error adding card:', error);
            return null;
        }
    };

    // Update card quantity in the backend using cardMarketId to identify the card
    const updateCardQuantity = async (cardMarketId: number, quantity: number) => {
        try {
            const existing = cardData.find((c) => c.cardMarketId === cardMarketId);
            const existingQty = existing ? existing.quantity : 0;
            const delta = quantity - existingQty;
            if (delta === 0) return;

            if (delta > 0) {
                const body: any = { quantity: delta, quantity_foil: 0, card_market_id: cardMarketId };
                const response = await fetch(`${CARDS_API_ENDPOINT}/collection/addCard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session}`,
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error('Failed to add card quantity');
                await fetchCollection();
            } else {
                const body: any = { quantity: Math.abs(delta), quantity_foil: 0, card_market_id: cardMarketId };
                const response = await fetch(`${CARDS_API_ENDPOINT}/collection/removeCard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session}`,
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error('Failed to remove card quantity');
                await fetchCollection();
            }
        } catch (error) {
            console.error('Error updating card quantity:', error);
        }
    };

    // Remove a card from the backend collection by cardMarketId
    const removeCard = async (cardMarketId: number, quantity = 1, quantity_foil = 0) => {
        try {
            const body: any = { quantity, quantity_foil, card_market_id: cardMarketId };

            const response = await fetch(`${CARDS_API_ENDPOINT}/collection/removeCard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Failed to remove card');
            }
            await fetchCollection();
        } catch (error) {
            console.error('Error removing card:', error);
        }
    }

    useEffect(() => {
        if (session) {
            fetchCollection(tcgId ?? undefined);
            fetchAllCardsForTcg();
        }
    }, [session, tcgId]);

    return (
        <CardContext.Provider value={{ cardCollectionData: cardData, addCard, updateCardQuantity, fetchCollection, removeCard, tcgName, setTcgName, allCards, fetchAllCardsForTcg, tcgId, setTcgId }}>
            {children}
        </CardContext.Provider>
    );
};

export const useCardContext = (): CardContextProps => {
    const context = useContext(CardContext);
    if (!context) {
        throw new Error('useCardContext must be used within a CardProvider');
    }
    return context;
};