import { openClickthrough } from "../clickthrough";
import ctaImage from "../assets/CTA (2).webp";

export const Cta = ({ className = "", sticky = false, atBottom = false }) => {
  const handleCTA = (event) => {
    event.stopPropagation();
    if (atBottom) console.log('CTA_CLICKED');
    openClickthrough();
  };

  const button = (
    <button
      type="button"
      className={`cta-button${className ? ` ${className}` : ""}`}
      onClick={handleCTA}
      aria-label="Shop now"
    >
      <img src={ctaImage} alt="" className="cta-button__image" />
    </button>
  );

  if (!sticky) {
    return button;
  }

  return (
    <div className={`cta-container${atBottom ? " cta-container--at-bottom" : ""}`}>
      {button}
    </div>
  );
};
