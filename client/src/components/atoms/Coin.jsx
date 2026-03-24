import React, { useState } from "react";
import "./css/Coin.css";

/**
 * A interactive coin flip component for making random predictions between two teams.
 * 
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.teams - The two teams to flip between.
 * @param {Function} props.onSuccess - Callback with the name of the winning team side.
 * @returns {React.ReactElement} The Coin component.
 */
export default function Coin({ teams, onSuccess }) {
    const [side, setSide] = useState(teams[0].name);
    const [flip, setFlip] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);

    /**
     * Triggers the coin flip animation and logic.
     */
    const flipCoin = () => {
        if (isFlipping) return;

        setIsFlipping(true);

        const newSide = Math.random() > 0.5 ? teams[0].name : teams[1].name;

        // Rotation: 3 full turns + 180 extra if side changes
        const extraRotation = side === newSide ? 0 : 180;
        setFlip((prevFlip) => prevFlip + (360 * 3) + extraRotation);

        setSide(newSide);

        // Wait for animation completion (1s in CSS) before trigger
        setTimeout(() => {
            setIsFlipping(false);
            onSuccess(newSide);
        }, 1000);
    };

    return (
        <div className="coin-container" onClick={flipCoin} title="¡Lanza una moneda para elegir!">
            <div className="coin" style={{ transform: `rotateY(${flip}deg)` }}>
                <div className="side heads" key={`heads-${teams[0].id}`}>
                    <img className="symbol" src={teams[0].logo_url} alt={teams[0].name} />
                </div>
                <div className="side tails" key={`tails-${teams[1].id}`}>
                    <img className="symbol" src={teams[1].logo_url} alt={teams[1].name} />
                </div>
            </div>
        </div>
    );
}
