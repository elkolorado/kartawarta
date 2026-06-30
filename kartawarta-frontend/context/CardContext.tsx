import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from '../hooks/useAuth';
import { CARDS_API_ENDPOINT } from '@/constants/apiConfig';
import { CardMarketCard } from '@/components/foundCardDetails';
import { fetchCardsWithPrices } from '@/actions/cardsApi';
import { DEFAULT_TCG_NAME } from '@/constants/tcgs';

export type UserLabel = {
    id: number;
    name: string;
    created_at?: string;
    quantity?: number;
    quantity_foil?: number;
};

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
    labels?: UserLabel[];
};

interface CardContextProps {
    cardCollectionData: CollectionItem[];
    allCards: CollectionItem[];
    fetchAllCardsForTcg: (tcg_id?: number) => Promise<void>;
    addCard: (newCard: CardMarketCard, quantity?: number, quantity_foil?: number) => Promise<number | null>;
    updateCardQuantity: (cardMarketId: number, quantity: number) => Promise<void>;
    fetchCollection: (tcg_id?: number) => Promise<void>;
    removeCard: (cardMarketId: number, quantity?: number, quantity_foil?: number, labelId?: number) => Promise<void>;
    labels: UserLabel[];
    fetchLabels: () => Promise<UserLabel[]>;
    createLabel: (name: string) => Promise<UserLabel | null>;
    updateLabel: (labelId: number, name: string) => Promise<UserLabel | null>;
    deleteLabel: (labelId: number) => Promise<boolean>;
    setCollectionLabels: (userCollectionId: number, labelIds: number[]) => Promise<boolean>;
    tcgName: string;
    setTcgName: (name: string) => void;
    tcgId: number | null;
    setTcgId: (id: number | null) => void;
}

const CardContext = createContext<CardContextProps | undefined>(undefined);

export default CardContext;

const buildCollectionUrl = (tcg_id?: number) => {
    const params = new URLSearchParams();
    if (tcg_id) params.set('tcg_id', String(tcg_id));

    const query = params.toString();
    return `${CARDS_API_ENDPOINT}/collection/${query ? `?${query}` : ''}`;
};

export const CardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cardData, setCardData] = useState<CollectionItem[]>([]);
    const [allCards, setAllCards] = useState<CollectionItem[]>([]);
    const [labels, setLabels] = useState<UserLabel[]>([]);
    const [tcgName, setTcgName] = useState<string>(DEFAULT_TCG_NAME);
    const [tcgId, setTcgId] = useState<number | null>(null);
    const { session, fetchWithAuth } = useSession();

    // Fetch the collection from the backend
    const fetchCollection = async (tcg_id?: number) => {
        try {
            const response = await fetchWithAuth(buildCollectionUrl(tcg_id));
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

    const fetchLabels = async () => {
        try {
            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/labels`);
            if (!response.ok) throw new Error('Failed to fetch labels');
            const data = await response.json();
            const nextLabels = Array.isArray(data) ? data : [];
            setLabels(nextLabels);
            return nextLabels;
        } catch (error) {
            console.error('Error fetching labels:', error);
            return [];
        }
    };

    const createLabel = async (name: string) => {
        try {
            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to create label');
            const label = await response.json();
            setLabels(prev => {
                const existingIndex = prev.findIndex(item => item.id === label.id);
                const next = existingIndex >= 0 ? [...prev] : [...prev, label];
                if (existingIndex >= 0) next[existingIndex] = label;
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });
            return label;
        } catch (error) {
            console.error('Error creating label:', error);
            return null;
        }
    };

    const updateLabel = async (labelId: number, name: string) => {
        try {
            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/labels/${labelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to update label');
            const label = await response.json();
            setLabels(prev => prev.map(item => item.id === label.id ? label : item).sort((a, b) => a.name.localeCompare(b.name)));
            await fetchCollection(tcgId ?? undefined);
            return label;
        } catch (error) {
            console.error('Error updating label:', error);
            return null;
        }
    };

    const deleteLabel = async (labelId: number) => {
        try {
            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/labels/${labelId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete label');
            setLabels(prev => prev.filter(item => item.id !== labelId));
            await fetchCollection(tcgId ?? undefined);
            return true;
        } catch (error) {
            console.error('Error deleting label:', error);
            return false;
        }
    };

    const setCollectionLabels = async (userCollectionId: number, labelIds: number[]) => {
        try {
            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/${userCollectionId}/labels`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label_ids: labelIds }),
            });
            if (!response.ok) throw new Error('Failed to update collection labels');
            await fetchCollection(tcgId ?? undefined);
            return true;
        } catch (error) {
            console.error('Error updating collection labels:', error);
            return false;
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

            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/addCard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Failed to add card');
            }
            const json = await response.json();
            // backend returns { success: True, user_collection_id: uc_id }
            const ucId = json?.user_collection_id ?? null;
            await fetchCollection(tcgId ?? undefined);
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
                const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/addCard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error('Failed to add card quantity');
                await fetchCollection(tcgId ?? undefined);
            } else {
                const body: any = { quantity: Math.abs(delta), quantity_foil: 0, card_market_id: cardMarketId };
                const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/removeCard`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error('Failed to remove card quantity');
                await fetchCollection(tcgId ?? undefined);
            }
        } catch (error) {
            console.error('Error updating card quantity:', error);
        }
    };

    // Remove a card from the backend collection by cardMarketId
    const removeCard = async (cardMarketId: number, quantity = 1, quantity_foil = 0, labelId?: number) => {
        try {
            const body: any = { quantity, quantity_foil, card_market_id: cardMarketId };
            if (labelId) body.label_id = labelId;

            const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/removeCard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Failed to remove card');
            }
            await fetchCollection(tcgId ?? undefined);
        } catch (error) {
            console.error('Error removing card:', error);
        }
    }

    useEffect(() => {
        if (session) {
            fetchCollection(tcgId ?? undefined);
            fetchLabels();
            fetchAllCardsForTcg();
        }
    }, [session, tcgId, tcgName]);

    return (
        <CardContext.Provider value={{ cardCollectionData: cardData, addCard, updateCardQuantity, fetchCollection, removeCard, labels, fetchLabels, createLabel, updateLabel, deleteLabel, setCollectionLabels, tcgName, setTcgName, allCards, fetchAllCardsForTcg, tcgId, setTcgId }}>
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