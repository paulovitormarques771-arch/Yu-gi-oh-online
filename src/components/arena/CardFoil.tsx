/** Surface finish only; callers must already have checked face-up visibility. */
export function CardFoil() {
  return <span className="card-foil" aria-hidden="true"><span className="card-foil-prism" /><span className="card-foil-sheen" /></span>;
}