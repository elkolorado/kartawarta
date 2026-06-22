// New sub-component for the row
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import FoundCardDetails from './foundCardDetails';
import { useRef } from 'react';

const SwipeableRow = ({ item, index, removeResult, updateResultCard, renderLeftActions, renderRightActions }: any) => {
    const swipeableRef = useRef<any>(null);

    const handleRemove = () => {
        // Force the swipeable back to the center position first
        // swipeableRef.current?.close();
        
        // Wait for the 'close' animation to actually happen before removing from state
        removeResult(index);
    };

    const handleSwipeOpen = (direction: 'left' | 'right') => {
        // If we swiped far enough to trigger the delete (Right to Left)
        if (direction === 'left') {
            handleRemove();
        } else {
            // If you have 'Add' on the other side, handle it here, 
            // otherwise just snap back
            swipeableRef.current?.close();
        }
    };

    return (
        <ReanimatedSwipeable
            ref={swipeableRef}
            friction={2}
            // If it's closing too fast, lower these thresholds (e.g. 80)
            rightThreshold={100}
            leftThreshold={100}
            // Use overshoot: false to prevent the card from flying off screen
            overshootRight={false}
            renderRightActions={(prog, drag) => renderRightActions(prog, drag, index, handleRemove)}
            renderLeftActions={renderLeftActions}
            onSwipeableOpen={handleSwipeOpen}
        >
            <FoundCardDetails {...item} onReplaceCard={(cardInfo: any) => updateResultCard?.(index, cardInfo)} />
        </ReanimatedSwipeable>
    );
};


export default SwipeableRow;