import React, { useState } from "react";
import "./css/Coin.css";

export default function Coin({ teams, onSuccess }) {
    const [side, setSide] = useState(teams[0].name); // Estado de la cara
    const [flip, setFlip] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);

    const flipCoin = () => {
        if (isFlipping) return; // Evita clics repetidos

        setIsFlipping(true);

        const newSide = Math.random() > 0.5 ? teams[0].name : teams[1].name;

        // Rotación: 3 vueltas completas + 180 extra si cambia la cara
        const extraRotation = side === newSide ? 0 : 180;
        setFlip((prevFlip) => prevFlip + 360 * 3 + extraRotation);

        setSide(newSide);
        setIsFlipping(false);

        setTimeout(() => {
            onSuccess(newSide)
        }, 1000);
    };

    return (
        <div className="coin-container" onClick={flipCoin}>
            <div className="coin" style={{ transform: `rotateY(${flip}deg)` }}>
                <div className="side heads" key={side === teams[0].name ? "visible" : "hidden"}>
                    <img className="symbol" src={teams[0].logo_url} alt={teams[0].name} />
                </div>
                <div className="side tails" key={side === teams[1].name ? "visible" : "hidden"}>
                    <img className="symbol" src={teams[1].logo_url} alt={teams[1].name} />
                </div>
            </div>
        </div>
    );
}
