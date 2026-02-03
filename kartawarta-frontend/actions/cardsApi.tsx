import { CARDS_API_ENDPOINT } from "@/constants/apiConfig";

export async function fetchCards(tcgName: string): Promise<any> {
  const url = `${CARDS_API_ENDPOINT}/cards/?tcg_name=${encodeURIComponent(tcgName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchCards error:", err);
    throw err;
  }
}

export async function fetchCardsWithPrices(tcgName: string): Promise<any> {
  const url = `${CARDS_API_ENDPOINT}/cards-with-prices/?tcg_name=${encodeURIComponent(tcgName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchCardsWithPrices error:", err);
    throw err;
  }
}

export async function fetchExpansions(tcgName: string): Promise<any> {
  const url = `${CARDS_API_ENDPOINT}/expansions/?tcg_name=${encodeURIComponent(tcgName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchExpansions error:", err);
    throw err;
  }
}

export async function fetchCardDetails(cardMarketId: number): Promise<any> {
  const url = `${CARDS_API_ENDPOINT}/card/${encodeURIComponent(String(cardMarketId))}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchCardDetails error:", err);
    throw err;
  }
}

export async function fetchTCGs(): Promise<string[]> {
  const url = `${CARDS_API_ENDPOINT}/tcgs/`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchTCGs error:", err);
    throw err;
  }
}

export default {
  fetchCards,
  fetchCardsWithPrices,
  fetchExpansions,
  fetchCardDetails,
  fetchTCGs,
};
