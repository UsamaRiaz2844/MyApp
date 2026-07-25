export default function SeenTicks({ seen }: { seen: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path
        d="M1 5.5L4.5 9L10.5 1.5"
        stroke={seen ? '#7dd3fc' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {seen && (
        <path
          d="M5.5 5.5L9 9L15 1.5"
          stroke="#7dd3fc"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
