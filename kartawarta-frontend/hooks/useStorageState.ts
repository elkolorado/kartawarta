import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [state, setState] = useState<T>(initialValue);

    useEffect(() => {
        const loadState = async () => {
            try {
                const storedValue = await AsyncStorage.getItem(key);
                if (storedValue !== null) {
                    setState(JSON.parse(storedValue));
                }
            } catch (error) {
                console.error(`Error loading ${key} from AsyncStorage:`, error);
            }
        };

        loadState();
    }, [key]);

    const setStorageState = async (value: T) => {
        try {
            setState(value);
            await AsyncStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error saving ${key} to AsyncStorage:`, error);
        }
    };

    return [state, setStorageState];
}