import type { SpineArtworkId } from "./spineTemplates";

export type SpineOrnamentVariant = "primary" | "secondary";

type SpineOrnamentProps = {
  artwork: SpineArtworkId;
  className?: string;
  variant?: SpineOrnamentVariant;
};

function PrimaryOrnament({ artwork }: { artwork: SpineArtworkId }) {
  if (artwork === "moon-forest") {
    return (
      <>
        <path data-art-accent="true" d="M31 5.5A13.5 13.5 0 1 0 35.8 30 11.4 11.4 0 1 1 31 5.5Z" />
        <path d="m12 10 1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1 1-2.8Zm27 18 .8 2.1 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.1Z" />
        <path d="M4.5 46 15 34l6.2 7.2 6.2-10.1L43.5 46M9 46h30" />
        <path d="M12 59V43m0 4-4.2-3.1m4.2 7.4 4.4-3.6M23 60V45m0 4.2-4-3.1m4 7.4 4.4-3.6M36 59V41m0 5-5-3.8m5 8.6 4.8-3.8" />
        <path d="M7 60h34" />
      </>
    );
  }

  if (artwork === "compass-star") {
    return (
      <>
        <circle cx="24" cy="31" r="15.5" />
        <circle cx="24" cy="31" r="10.5" />
        <path d="M24 4v54M1 31h46M7.5 14.5l33 33m0-33-33 33" />
        <path data-art-accent="true" d="m24 10 4.1 16.9L42 31l-13.9 4.1L24 52l-4.1-16.9L6 31l13.9-4.1L24 10Z" />
        <circle cx="24" cy="31" r="2.2" fill="currentColor" stroke="none" />
        <path d="m8 7 .8 2.1 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8L8 7Zm32 47 .7 1.8 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.8Z" />
      </>
    );
  }

  if (artwork === "leafy-sprig") {
    return (
      <>
        <path d="M17 59C18 42 23 24 36 6" />
        <path d="M20 48C11.5 48 6.5 44.2 4 37.5c8-.8 13.6 2.3 16.8 8.2M23 39c8-.9 13-5 15-12-7.8-.2-13 3.3-15.6 10M27 29c-6.8-1.2-10.7-4.7-12-10.3 6.7.1 11 3 12.8 8.6M30 20c6.2-1.1 10-4.5 11.4-10.1-6.1.1-10.1 2.9-12 8.6M18 54c-5.4-.4-9-2.8-10.8-7.1 5.3-.1 8.9 1.9 11 5.8" />
        <circle cx="37.5" cy="6.5" r="2" />
        <path d="M10 60h18M13 62h12" />
      </>
    );
  }

  if (artwork === "botanical-key") {
    return (
      <>
        <circle data-art-accent="true" cx="25" cy="15" r="8.5" />
        <circle cx="25" cy="15" r="3.3" />
        <path d="M25 23.5V56m0-8h8m-8 5h5m-5 3 4 4" />
        <path d="M24.5 34C16 34 10.8 30.6 8.5 24.5c7.9-.6 13.3 2.3 16.3 7.8M25.5 41c7.7-.8 12.6-4.6 14.6-11.3-7.5-.1-12.5 3.1-14.9 9.1" />
        <path d="M16 54c-4.7-.1-7.8-2-9.6-5.8 4.6-.4 7.8 1.3 9.8 4.7M34 52c4.5-.2 7.5-2.2 9-6-4.4-.2-7.5 1.5-9.2 5" />
      </>
    );
  }

  if (artwork === "rose-bloom") {
    return (
      <>
        <path d="M24 59V31" />
        <path d="M24 39c-7.1-5-13.4-5.2-18.5-.6 3.3 6 9.4 7.6 18.5 4.9M24 47c7-4.5 13.3-4.2 18.3.7-3.7 5.7-9.7 6.8-18.3 3.8" />
        <path data-art-accent="true" d="M24 8c4.1-7 11-4.1 10.2 1.5 5.8-1 8.4 5.4 4 8.5 3.1 4.7-2 9.2-6.8 6.4-1.9 5.4-8.6 5.3-10.1.1-4.8 2.7-9.7-1.8-6.4-6.4-4.5-3.2-1.8-9.4 3.9-8.5-.5-5.6 6.3-8.6 10.2-1.6Z" />
        <path d="M19.3 14c2.1-3.9 7.5-4.7 10.1-1.2 2.3 3.1.3 7.5-3.6 7.8-3.5.3-6.8-2.7-6.5-6.6Z" />
        <path d="M21.5 13.5c2.7-.5 4.8.5 6.4 3" />
      </>
    );
  }

  if (artwork === "wildflowers") {
    return (
      <>
        <path d="M11 59c1-13 5-24 12-34M24 59c0-17 1-30 0-42M37 59c-1-14-4-25-10-33" />
        <path d="M13 43c-5.6-.2-9-2.4-10.5-6.8 5.4-.5 9 1.3 10.9 5.5M34 43c5.7-.3 9.3-2.8 10.8-7.3-5.6-.3-9.2 1.8-11.1 6M19 35c-5-.5-8-2.8-9-7 4.9 0 8 1.8 9.5 5.7M29 34c4.8-.6 7.7-3 8.6-7.1-4.6.1-7.6 2-8.9 5.8" />
        <circle data-art-accent="true" cx="24" cy="14" r="4.5" />
        <path d="M24 4v5m0 10v5M14 14h5m10 0h5m-13.5-3.5-4-4m11 4 4-4" />
        <path d="M7 28c0-4.8 7-4.8 7 0 0 4.4-3.5 6.3-3.5 6.3S7 32.4 7 28Zm27-1c0-4.8 7-4.8 7 0 0 4.4-3.5 6.3-3.5 6.3S34 31.4 34 27Z" />
      </>
    );
  }

  if (artwork === "crossed-axes") {
    return (
      <>
        <path d="m8 10 8.8 1.1 5.5 6.2-6 5.4-8.4-1.3 4.3-5.5L8 10Z" />
        <path d="M18.5 20.5 39 55l-3.6 2.2-20.5-34.4" />
        <path d="m40 10-8.8 1.1-5.5 6.2 6 5.4 8.4-1.3-4.3-5.5L40 10Z" />
        <path d="M29.5 20.5 9 55l3.6 2.2 20.5-34.4" />
        <path d="M16 31h16M19 35h10" />
        <path d="m24 4 1.1 3 3.1 1.1-3.1 1.1-1.1 3-1.1-3-3.1-1.1L22.9 7 24 4Z" />
      </>
    );
  }

  if (artwork === "crown-blade") {
    return (
      <>
        <path d="M24 5 30 16l-2.8 32L24 57l-3.2-9L18 16 24 5Z" />
        <path d="M17 21h14M15 25h18M18 49h12" />
        <path d="M6 12 13 17l11-7 11 7 7-5-3 15H9L6 12Z" />
        <path d="M10 30c4-2.2 8.7-3.3 14-3.3S34 27.8 38 30" />
        <circle cx="13" cy="18" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="24" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="35" cy="18" r="1.2" fill="currentColor" stroke="none" />
      </>
    );
  }

  if (artwork === "serpent-rose") {
    return (
      <>
        <path d="M28 4c-11 4.3-13.7 12.3-5.3 18 10 6.8 9.4 15.6-.6 20.8-9 4.6-7.5 11.5 2.5 16.4" />
        <path d="M22.8 22.4c8.2-3.8 14.8-2 18.4 4.7-6.7 4.7-13.2 4.2-19-1.6M21.8 43.1c-8-2.5-14.2-.1-17.1 6.8 7 3.7 13.3 2.4 18.2-4" />
        <path d="m26.2 6 7-2.7-2.5 7.1M21.5 59l3-5.2 3.5 5.2" />
        <path data-art-accent="true" d="M13.5 15.5c1.2-4.9 5.9-6.9 9.4-4 3.7 3.1 1.7 8.8-2.7 9.2-4.1.4-7.7-1.6-6.7-5.2Z" />
        <path d="m13 13-3.5-2.3m4.7 7.1-4.2 2.5M16 14.5c2.1-.8 4-.4 5.5 1.2" />
        <circle cx="29.5" cy="6.2" r=".8" fill="currentColor" stroke="none" />
      </>
    );
  }

  if (artwork === "thorn-heart") {
    return (
      <>
        <path data-art-accent="true" d="M24 54S6 43.4 6 26.6C6 13.7 21.2 12.1 24 23c2.8-10.9 18-9.3 18 3.6C42 43.4 24 54 24 54Z" />
        <path d="M3 20c9.2 2 16.2 8.2 21 18.8C28.8 28.2 35.8 22 45 20" />
        <path d="M8 15c-.3 6.7 3.2 12.1 10.5 16.2M40 15c.3 6.7-3.2 12.1-10.5 16.2" />
        <path d="m8.5 20-4-6m6.2 9.7-7 1m33.6-1 7 1m-4.8-4.7 4-6M16 55l8-6 8 6" />
        <path d="M22 6.5 24 3l2 3.5M20 59h8" />
      </>
    );
  }

  if (artwork === "mountain-pines") {
    return (
      <>
        <path d="M3 39 14.5 23l7 8.5L29 17l16 22H3Z" />
        <path d="m14.5 23 4 4.8 3-2.5L29 39m0-22 7.2 10.2 3.2-2.3" />
        <path d="M6 39h36" />
        <path d="M11 59V40m0 5-5-3.8m5 8.3 5-3.8m8 14.3V37m0 7-6-4.5m6 10.5 6-4.8m10 13.8V39m0 6-5-3.8m5 8.5 5-3.8" />
        <circle cx="10" cy="12" r="4.5" />
        <path d="M5 62h38" />
      </>
    );
  }

  if (artwork === "frost-mountain") {
    return (
      <>
        <path data-art-accent="true" d="M24 3v24M12 8l24 14M36 8 12 22M18 5l6 5 6-5M9 13l8 2-1-8m23 6-8 2 1-8M12 25l8-2-1 8m17-6-8-2 1 8" />
        <path d="M3 47 15 33l7 8 7-12 16 18H3Z" />
        <path d="m15 33 4 4.3 3-2.6L29 47m0-18 6.4 8 3.2-2" />
        <path d="M11 60V47m0 4-4-3m4 7 4-3M37 60V45m0 5-4.5-3.3m4.5 7.4 4.2-3.2M7 61h35" />
      </>
    );
  }

  if (artwork === "heart-vine") {
    return (
      <>
        <path data-art-accent="true" d="M24 35S8 25.7 8 12.8C8 2.7 21.5 1.6 24 10.1 26.5 1.6 40 2.7 40 12.8 40 25.7 24 35 24 35Z" />
        <path d="M24 35v24" />
        <path d="M24 43c-7.5-5.1-13.8-5.2-19-.7 3.4 6.2 9.6 7.8 19 5.1M24 51c7-4.6 13.3-4.3 18.4.7-3.8 5.7-9.9 6.8-18.4 3.9" />
        <path d="M14 13c3-3 6-3 10 1.5 4-4.5 7-4.5 10-1.5" />
        <circle cx="24" cy="21" r="1.3" fill="currentColor" stroke="none" />
      </>
    );
  }

  if (artwork === "playing-cards") {
    return (
      <>
        <g transform="rotate(-10 17 31)">
          <rect x="6" y="9" width="23" height="42" rx="2.5" />
          <path data-art-accent="true" d="M11 15h5v5h-5zM24 45h-5v-5h5z" />
          <path data-art-accent="true" d="M17.5 37s-6-3.6-6-8.2c0-3.5 5.1-4 6-1 .9-3 6-2.5 6 1 0 4.6-6 8.2-6 8.2Z" />
        </g>
        <g transform="rotate(11 31 31)">
          <rect x="20" y="9" width="23" height="42" rx="2.5" />
          <path data-art-accent="true" d="m31.5 23 5 6-5 6-5-6 5-6ZM25 15h5v5h-5zM38 45h-5v-5h5z" />
        </g>
        <path d="M12 58h24M17 61h14" />
      </>
    );
  }

  if (artwork === "hockey-heart") {
    return (
      <>
        <path d="M9 5c3.5 13.5 9.7 29.5 22.5 48L40 54l-3 5-9.2-2.5C16.7 39.5 8.2 21.2 4.5 7L9 5Z" />
        <path d="M39 5c-3.5 13.5-9.7 29.5-22.5 48L8 54l3 5 9.2-2.5C31.3 39.5 39.8 21.2 43.5 7L39 5Z" />
        <path data-art-accent="true" d="M24 43S14 37.2 14 29.3c0-6.1 8.5-6.8 10-1.6 1.5-5.2 10-4.5 10 1.6C34 37.2 24 43 24 43Z" />
        <ellipse cx="24" cy="52" rx="5.5" ry="2.2" />
        <path d="M17 13h14M20 10h8" />
      </>
    );
  }

  if (artwork === "crossed-sticks") {
    return (
      <>
        <path d="M9 5c3.8 14 10 29 23 47l8 1-3.2 5.2-8.8-2.4C16 39.3 8 21 4.8 7L9 5Z" />
        <path d="M39 5c-3.8 14-10 29-23 47l-8 1 3.2 5.2 8.8-2.4C32 39.3 40 21 43.2 7L39 5Z" />
        <ellipse cx="24" cy="43" rx="6" ry="2.5" />
        <path d="M12 36h24v18M12 54V36m4 0v18m4-18v18m4-18v18m4-18v18m4-18v18" />
        <path d="M12 45h24M12 50h24" />
      </>
    );
  }

  if (artwork === "fox-moon") {
    return (
      <>
        <path data-art-accent="true" d="M30.5 4.5A12.5 12.5 0 1 0 34 27.2 10.6 10.6 0 1 1 30.5 4.5Z" />
        <path d="m8 18 7-11 8.7 7 9-7L40 18l-2.5 22L24 56 10.5 40 8 18Z" />
        <path d="m15 10 2.5 12M33 10l-2.5 12M17 29l5-2m9 2-5-2" />
        <path d="m21 38 3 2 3-2M24 40v5m0 0c-3.2 0-5.6-1.2-7-3.5m7 3.5c3.2 0 5.6-1.2 7-3.5" />
        <path d="M12 49c-5.4 1.8-8.2 5.4-8.5 10.8 4.8-2.1 8.2-5.4 10.2-9.8" />
        <circle cx="19" cy="28" r="1" fill="currentColor" stroke="none" />
        <circle cx="29" cy="28" r="1" fill="currentColor" stroke="none" />
      </>
    );
  }

  if (artwork === "sealed-letter") {
    return (
      <>
        <rect x="5" y="14" width="38" height="31" rx="2.5" />
        <path d="m6 17 18 15 18-15M6 43l13-14m23 14L29 29" />
        <circle data-art-accent="true" cx="24" cy="33" r="5.2" />
        <path d="M24 29.5c1.2-2.5 4.8-1.9 4.8.8 0 2.6-4.8 5.2-4.8 5.2s-4.8-2.6-4.8-5.2c0-2.7 3.6-3.3 4.8-.8Z" />
        <path d="M11 51c-4.5-.2-7.4-2-8.8-5.5 4.4-.3 7.4 1.2 9.1 4.5M37 51c4.5-.2 7.4-2 8.8-5.5-4.4-.3-7.4 1.2-9.1 4.5" />
        <path d="M13 56h22M17 59h14" />
      </>
    );
  }

  if (artwork === "wedding-rings") {
    return (
      <>
        <circle cx="18" cy="34" r="11" />
        <circle cx="30" cy="34" r="11" />
        <path data-art-accent="true" d="m30 11 5 7-5 5-5-5 5-7Zm-5 7h10" />
        <path d="M9 52c-4.5-.2-7.2-2-8.5-5.5 4.3-.3 7.1 1.2 8.8 4.4M39 52c4.5-.2 7.2-2 8.5-5.5-4.3-.3-7.1 1.2-8.8 4.4" />
        <path d="M13 58h22M17 61h14" />
      </>
    );
  }

  if (artwork === "moth-bloom") {
    return (
      <>
        <path d="M24 16c-5-8-13-9.5-19-4 1 9.5 6.2 16 15.5 19M24 16c5-8 13-9.5 19-4-1 9.5-6.2 16-15.5 19" />
        <path d="M20.5 31C12 28.5 6 31.3 4 39c7.6 4 13.2 1.3 17.8-4.5M27.5 31C36 28.5 42 31.3 44 39c-7.6 4-13.2 1.3-17.8-4.5" />
        <path d="M24 13v31m-3-29-4-7m10 7 4-7" />
        <path data-art-accent="true" d="M24 43c3-5.8 8.7-4.2 8.5.4 4.6-.6 6.4 4.8 2.7 7.3 2.2 3.8-2.3 7.1-5.8 4.8-1.5 4.1-7 4.1-8.3 0-3.6 2.3-7.9-1.2-5.7-5-3.4-2.5-1.4-7.6 3.3-7.1-.2-4.6 5.5-5.8 5.3-.4Z" />
        <path d="M20.5 49c1.8-2.5 5.2-2.7 7.2-.4" />
      </>
    );
  }

  if (artwork === "lips") {
    return (
      <>
        <path data-art-accent="true" d="M4 31c7.7-9.2 13.4-13.8 20-8.4 6.6-5.4 12.3-.8 20 8.4-5.8 10.2-12.8 15.3-20 15.3S9.8 41.2 4 31Z" />
        <path d="M5 31c8.8.8 14.8-.5 19-3.8 4.2 3.3 10.2 4.6 19 3.8M12 36c8 3.1 16 3.1 24 0" />
        <path d="m13 10 1.2 3.2 3.3 1.2-3.3 1.2-1.2 3.2-1.2-3.2-3.3-1.2 3.3-1.2L13 10Zm24 39 1 2.7 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1 1-2.7Z" />
        <path d="M16 57h16" />
      </>
    );
  }

  if (artwork === "watching-eye") {
    return (
      <>
        <path d="M3 28c5.8-8.5 12.8-12.7 21-12.7S39.2 19.5 45 28c-5.8 8.5-12.8 12.7-21 12.7S8.8 36.5 3 28Z" />
        <circle data-art-accent="true" cx="24" cy="28" r="8.2" />
        <circle cx="24" cy="28" r="3" fill="currentColor" stroke="none" />
        <path d="M24 4v8M8 9l6 6M40 9l-6 6M5 45l8-6m30 6-8-6M24 44v16" />
        <path d="M19.5 51c0-6 9-6 9 0 0 3.3-2.3 4.5-2.3 7h-4.4c0-2.5-2.3-3.7-2.3-7Z" />
        <path d="M16 62h16" />
      </>
    );
  }

  return (
    <>
      <path d="M19 18h10v25H19zM17 43h14M18 47h12" />
      <path d="M20 18c0-7 4-10 4-15 5 5 8 9 6 14-1.6 4-7 4.8-10 1Z" />
      <path d="M24 48v10m0-5h10m-3-4 4 4-4 4M24 58l-4 4" />
      <path d="M14 35c-5.7-.1-9.4-2.5-11.3-7.1 5.6-.5 9.5 1.6 11.7 5.7M34 36c5.5-.5 9-3 10.5-7.6-5.4-.1-9 2-10.8 6.2" />
      <circle cx="24" cy="27" r="1.5" fill="currentColor" stroke="none" />
    </>
  );
}

function IllustrationWash({ artwork }: { artwork: SpineArtworkId }) {
  if (artwork === "moon-forest") {
    return <path data-art-fill="true" d="M31 5.5A13.5 13.5 0 1 0 35.8 30 11.4 11.4 0 1 1 31 5.5Z" />;
  }
  if (artwork === "compass-star") {
    return <path data-art-fill="true" d="m24 10 4.1 16.9L42 31l-13.9 4.1L24 52l-4.1-16.9L6 31l13.9-4.1L24 10Z" />;
  }
  if (artwork === "leafy-sprig" || artwork === "botanical-key") {
    return (
      <g data-art-fill="true">
        <ellipse cx="14" cy="42" rx="6.8" ry="3.2" transform="rotate(25 14 42)" />
        <ellipse cx="30" cy="31" rx="7" ry="3.1" transform="rotate(-35 30 31)" />
        <ellipse cx="21" cy="24" rx="5.8" ry="2.8" transform="rotate(34 21 24)" />
        <ellipse cx="34" cy="15" rx="5.2" ry="2.5" transform="rotate(-35 34 15)" />
      </g>
    );
  }
  if (artwork === "rose-bloom") {
    return <path data-art-fill="true" d="M24 8c4.1-7 11-4.1 10.2 1.5 5.8-1 8.4 5.4 4 8.5 3.1 4.7-2 9.2-6.8 6.4-1.9 5.4-8.6 5.3-10.1.1-4.8 2.7-9.7-1.8-6.4-6.4-4.5-3.2-1.8-9.4 3.9-8.5-.5-5.6 6.3-8.6 10.2-1.6Z" />;
  }
  if (artwork === "wildflowers") {
    return (
      <g data-art-fill="true">
        <circle cx="24" cy="14" r="5.2" />
        <circle cx="10.5" cy="28" r="3.8" />
        <circle cx="37.5" cy="27" r="3.8" />
      </g>
    );
  }
  if (artwork === "crossed-axes") {
    return (
      <g data-art-fill="true">
        <path d="m8 10 8.8 1.1 5.5 6.2-6 5.4-8.4-1.3 4.3-5.5L8 10Z" />
        <path d="m40 10-8.8 1.1-5.5 6.2 6 5.4 8.4-1.3-4.3-5.5L40 10Z" />
      </g>
    );
  }
  if (artwork === "crown-blade") {
    return <path data-art-fill="true" d="M6 12 13 17l11-7 11 7 7-5-3 15H9L6 12Z" />;
  }
  if (artwork === "serpent-rose") {
    return (
      <g data-art-fill="true">
        <path d="M13.5 15.5c1.2-4.9 5.9-6.9 9.4-4 3.7 3.1 1.7 8.8-2.7 9.2-4.1.4-7.7-1.6-6.7-5.2Z" />
        <path d="m24 24 3 1.8-3 1.8-3-1.8 3-1.8Zm1 9 3 1.8-3 1.8-3-1.8 3-1.8Zm-3 10 3 1.8-3 1.8-3-1.8 3-1.8Z" />
      </g>
    );
  }
  if (artwork === "thorn-heart") {
    return <path data-art-fill="true" d="M24 54S6 43.4 6 26.6C6 13.7 21.2 12.1 24 23c2.8-10.9 18-9.3 18 3.6C42 43.4 24 54 24 54Z" />;
  }
  if (artwork === "heart-vine") {
    return <path data-art-fill="true" d="M24 35S8 25.7 8 12.8C8 2.7 21.5 1.6 24 10.1 26.5 1.6 40 2.7 40 12.8 40 25.7 24 35 24 35Z" />;
  }
  if (artwork === "mountain-pines") {
    return <path data-art-fill="true" d="M3 39 14.5 23l7 8.5L29 17l16 22H3Z" />;
  }
  if (artwork === "frost-mountain") {
    return <path data-art-fill="true" d="M3 47 15 33l7 8 7-12 16 18H3Z" />;
  }
  if (artwork === "playing-cards") {
    return (
      <g data-art-fill="true">
        <rect x="6" y="9" width="23" height="42" rx="2.5" transform="rotate(-10 17 31)" />
        <rect x="20" y="9" width="23" height="42" rx="2.5" transform="rotate(11 31 31)" />
      </g>
    );
  }
  if (artwork === "hockey-heart") {
    return <path data-art-fill="true" d="M24 43S14 37.2 14 29.3c0-6.1 8.5-6.8 10-1.6 1.5-5.2 10-4.5 10 1.6C34 37.2 24 43 24 43Z" />;
  }
  if (artwork === "crossed-sticks") {
    return <ellipse data-art-fill="true" cx="24" cy="43" rx="6" ry="2.5" />;
  }
  if (artwork === "fox-moon") {
    return <path data-art-fill="true" d="m8 18 7-11 8.7 7 9-7L40 18l-2.5 22L24 56 10.5 40 8 18Z" />;
  }
  if (artwork === "sealed-letter") {
    return <rect data-art-fill="true" x="5" y="14" width="38" height="31" rx="2.5" />;
  }
  if (artwork === "wedding-rings") {
    return <path data-art-fill="true" d="m30 11 5 7-5 5-5-5 5-7Z" />;
  }
  if (artwork === "moth-bloom") {
    return (
      <g data-art-fill="true">
        <path d="M24 16c-5-8-13-9.5-19-4 1 9.5 6.2 16 15.5 19L24 16Z" />
        <path d="M24 16c5-8 13-9.5 19-4-1 9.5-6.2 16-15.5 19L24 16Z" />
        <path d="M20.5 31C12 28.5 6 31.3 4 39c7.6 4 13.2 1.3 17.8-4.5l-1.3-3.5Zm7 0C36 28.5 42 31.3 44 39c-7.6 4-13.2 1.3-17.8-4.5l1.3-3.5Z" />
      </g>
    );
  }
  if (artwork === "lips") {
    return <path data-art-fill="true" d="M4 31c7.7-9.2 13.4-13.8 20-8.4 6.6-5.4 12.3-.8 20 8.4-5.8 10.2-12.8 15.3-20 15.3S9.8 41.2 4 31Z" />;
  }
  if (artwork === "watching-eye") {
    return (
      <g data-art-fill="true">
        <path d="M3 28c5.8-8.5 12.8-12.7 21-12.7S39.2 19.5 45 28c-5.8 8.5-12.8 12.7-21 12.7S8.8 36.5 3 28Z" />
        <circle cx="24" cy="28" r="8.2" data-art-fill-strong="true" />
      </g>
    );
  }
  return <rect data-art-fill="true" x="19" y="18" width="10" height="25" rx="1" />;
}

function EngravingDetail({ artwork }: { artwork: SpineArtworkId }) {
  if (artwork === "moon-forest") {
    return (
      <g data-art-detail="true">
        <path d="M27.5 9.5c-5.7 2.8-8.3 7.1-7.8 12.9M29.2 13c-3.5 2.2-5 5-4.6 8.5" />
        <path d="m15 34 2.8 7.2m9.6-10.1 3.5 9.2M10 51h4m7 2h4m7-4h5" />
        <circle data-art-dot="true" cx="18" cy="8" r=".75" />
        <circle data-art-dot="true" cx="41" cy="20" r=".6" />
      </g>
    );
  }

  if (artwork === "compass-star") {
    return (
      <g data-art-detail="true">
        <path d="m24 16 2.4 12.6L36 31l-9.6 2.4L24 46l-2.4-12.6L12 31l9.6-2.4L24 16Z" />
        <path d="M24 19v8m0 8v8M14 31h7m6 0h7M16.5 23.5l4.8 4.8m5.4 5.4 4.8 4.8m0-15-4.8 4.8m-5.4 5.4-4.8 4.8" />
        <circle cx="24" cy="31" r="6" />
      </g>
    );
  }

  if (artwork === "leafy-sprig" || artwork === "botanical-key") {
    return (
      <g data-art-detail="true">
        <path d="m19 46-8.5-7m13-1.5 10-10M26.5 28l-9-8.2M29.5 20l8-9.2M17 53l-7-5.2" />
        <path d="M20 48c-3.8-3.1-7.2-5-10.4-5.7M23 39c3.9-3.5 8-6 12.4-7.5M27 29c-3.2-3.1-6.4-5.1-9.7-6.2M30 20c3.1-3 6.1-5 9.1-6" />
        <circle data-art-dot="true" cx="14" cy="55" r=".65" />
      </g>
    );
  }

  if (artwork === "rose-bloom") {
    return (
      <g data-art-detail="true">
        <path d="M20.5 12.5c3.8-2 8.2-.6 9.3 3.1.9 3-1.2 5.8-4.5 6M18.6 16c2.4 1 4.7.8 6.8-.7 2.6-1.8 5.3-1.8 8.1.1M21 20c3.8.7 7-.4 9.7-3.2" />
        <path d="m23 39-11-1.8m13 10.2 11-1.5M15 39l-5.4-2.2m23.8 10.8 5.2-2" />
      </g>
    );
  }

  if (artwork === "wildflowers") {
    return (
      <g data-art-detail="true">
        <path d="M24 9v10m-5-5h10m-8.6-3.6 7.2 7.2m0-7.2-7.2 7.2" />
        <path d="m11 29-.5 5m27-6v5M14 43l-8-4m28 4 8-4M19 35l-7-5m17 4 7-5" />
        <circle data-art-dot="true" cx="10.5" cy="28" r="1" />
        <circle data-art-dot="true" cx="37.5" cy="27" r="1" />
      </g>
    );
  }

  if (artwork === "crossed-axes") {
    return (
      <g data-art-detail="true">
        <path d="M10 13.5h6l3.2 3.6-4 2.8-5.1-.8M38 13.5h-6l-3.2 3.6 4 2.8 5.1-.8" />
        <path d="m18.5 26 15.3 25.7M29.5 26 14.2 51.7" />
        <path d="m20.5 32 3-1.8m1.5 8.5 3-1.8m-8.5 6 3-1.8m5.5 9.2 3-1.8" />
        <circle data-art-dot="true" cx="24" cy="8" r=".8" />
      </g>
    );
  }

  if (artwork === "crown-blade") {
    return (
      <g data-art-detail="true">
        <path d="m24 10 2.5 7.5L25 45l-1 6-1-6-1.5-27.5L24 10Z" />
        <path d="M10 17.5 14 21l10-6 10 6 4-3.5M12 23h24" />
        <path d="m16 19 2.5 3m13.5-3-2.5 3M21 18l3 4 3-4" />
      </g>
    );
  }

  if (artwork === "serpent-rose") {
    return (
      <g data-art-detail="true">
        <path d="m23.5 11 4 2.4-4.8 2.6 4.6 2.7-4.1 2.4m2.3 7.2 4.2 2.5-4.7 2.6 4.4 2.8-4.6 2.6m-4.5 7.5 4 2.4-4.5 2.6 4.2 2.6" />
        <path d="M16.5 13.5c2.2-1 5-.3 6.1 1.8.9 1.8-.1 3.6-2 4.1M15.4 16c2.3.6 4.3.2 6-1.2" />
        <circle data-art-dot="true" cx="30.5" cy="6" r=".6" />
      </g>
    );
  }

  if (artwork === "thorn-heart" || artwork === "heart-vine") {
    return (
      <g data-art-detail="true">
        <path d="M13 21c2.8-4.8 7.8-4 11 1.8 3.2-5.8 8.2-6.6 11-1.8M12 29c3.8 6.7 7.8 11.2 12 13.5 4.2-2.3 8.2-6.8 12-13.5" />
        <path d="m12 21-3-4m5.5 8-5 1m24-1 5 1M36 21l3-4M18 48l6-4 6 4" />
        <circle data-art-dot="true" cx="24" cy="50" r=".75" />
      </g>
    );
  }

  if (artwork === "mountain-pines" || artwork === "frost-mountain") {
    return (
      <g data-art-detail="true">
        <path d="m14.5 23 3.5 2.5 3.5-1.5m7.5-7 4 4 3-1.8M8 35l6-6m15 10 7-9" />
        <path d="M9 48h6m-7 5h8m5-4h6m-7 5h8m6-8h6m-7 5h8" />
        <circle data-art-dot="true" cx="39" cy="12" r=".7" />
        <circle data-art-dot="true" cx="43" cy="17" r=".5" />
      </g>
    );
  }

  if (artwork === "playing-cards") {
    return (
      <g data-art-detail="true">
        <path d="M10 23h4m-2-2v4m23-5h4m-2-2v4" />
        <path d="M14 43c2-2 4.3-2.5 7-1.4M28 18c2.5-1.5 5-1.5 7.5 0" />
        <circle data-art-dot="true" cx="11" cy="47" r=".7" />
        <circle data-art-dot="true" cx="39" cy="14" r=".7" />
      </g>
    );
  }

  if (artwork === "hockey-heart" || artwork === "crossed-sticks") {
    return (
      <g data-art-detail="true">
        <path d="M9.5 12.5 14 11m-3 7 4.8-1.6m22.7-3.9L34 11m3 7-4.8-1.6M16 30l3-1.7m13 1.7-3-1.7" />
        <path d="M18.8 49.5h10.4m-8.7 3h7" />
        <circle data-art-dot="true" cx="24" cy="34" r=".65" />
      </g>
    );
  }

  if (artwork === "fox-moon") {
    return (
      <g data-art-detail="true">
        <path d="M13 21c3-3.5 6.5-5.3 10.7-5.3S31.8 17.5 35 21M14 37c3 5.2 6.3 8.6 10 10.3 3.7-1.7 7-5.1 10-10.3" />
        <path d="m14.5 17 4.5 5m14.5-5-4.5 5M17 34l3 2m11-2-3 2" />
        <path d="M27.5 8.5c-4 2.5-5.7 5.5-5.2 9" />
        <circle data-art-dot="true" cx="39" cy="8" r=".7" />
      </g>
    );
  }

  if (artwork === "sealed-letter") {
    return (
      <g data-art-detail="true">
        <path d="M9 18h8m-8 3h5M32 18h7m-5 3h5" />
        <circle cx="24" cy="33" r="2.8" />
        <path d="m21.5 33 2.5 1.8 2.5-1.8M10 49l4 3m24-3-4 3" />
        <path data-art-accent="true" d="M33 8h9v7h-9z" />
      </g>
    );
  }

  if (artwork === "wedding-rings") {
    return (
      <g data-art-detail="true">
        <path d="M12 34c0-3.3 2.7-6 6-6m6 6c0-3.3 2.7-6 6-6" />
        <path d="m30 12 2.8 5-2.8 3-2.8-3 2.8-5ZM15 50l3-3m12 3 3-3" />
        <path d="m9 14 1 2.6 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1L9 14Z" />
      </g>
    );
  }

  if (artwork === "moth-bloom") {
    return (
      <g data-art-detail="true">
        <path d="M8 13c5.8 2.8 10 7.7 12.5 14.7M40 13c-5.8 2.8-10 7.7-12.5 14.7M7 37c4.8-1 9.2-1.8 13.2-2.5M41 37c-4.8-1-9.2-1.8-13.2-2.5" />
        <path d="m11 17 6 2m20-2-6 2M9 34l6 2m24-2-6 2" />
        <path d="M20 46c3-2.2 7-1.7 8.5 1.2 1.2 2.4-.1 4.7-2.7 5.6" />
        <circle data-art-dot="true" cx="24" cy="19" r=".65" />
      </g>
    );
  }

  if (artwork === "lips") {
    return (
      <g data-art-detail="true">
        <path d="M10 31c4.5-2.2 8.8-2.8 13-1.8m2 0c4.2-1 8.5-.4 13 1.8M14 38c6.8 2.2 13.5 2.2 20 0" />
        <path d="M16 25c2-1.4 4.5-1.7 7.5-.8m9 1.2c-2-1.4-4.5-1.7-7.5-.8" />
        <path data-art-accent="true" d="M17 34c4.5 1.4 9 1.4 13.5 0" />
      </g>
    );
  }

  if (artwork === "watching-eye") {
    return (
      <g data-art-detail="true">
        <path d="M8 24c4.3-3.5 9.7-5.3 16-5.3S35.7 20.5 40 24M8 32c4.3 3.5 9.7 5.3 16 5.3S35.7 35.5 40 32" />
        <path d="M6 20 2 17m9 1-2-5m8 3-.5-5m25 9 4-3m-9 1 2-5m-8 3 .5-5" />
        <circle cx="24" cy="28" r="4.6" />
      </g>
    );
  }

  return (
    <g data-art-detail="true">
      <path d="M21 20v20m6-20v20M19 25h10M19 38h10" />
      <path d="M22 13c1-2.7 2.2-5 3.7-7M12 34l-6-3m30 4 6-3" />
      <circle data-art-dot="true" cx="24" cy="27" r=".7" />
    </g>
  );
}

function SecondaryOrnament({ artwork }: { artwork: SpineArtworkId }) {
  if (artwork === "moon-forest" || artwork === "compass-star" || artwork === "fox-moon") {
    return (
      <>
        <path d="M27 10a9 9 0 1 0 3 16 7.6 7.6 0 1 1-3-16Z" />
        <path d="m15 28 1.2 3.2 3.3 1.2-3.3 1.2-1.2 3.2-1.2-3.2-3.3-1.2 3.3-1.2L15 28Z" />
        <path d="M5 48 16 38l7 7 8-12 12 15M8 51h32" />
      </>
    );
  }

  if (["leafy-sprig", "botanical-key", "wildflowers", "rose-bloom", "moth-bloom"].includes(artwork)) {
    return (
      <>
        <path d="M24 55V14" />
        <path d="M23 42C15 42 10 38.5 7.5 32c7.8-.5 13 2.5 15.8 8.2M25 35c7.8-.7 12.8-4.5 15-11.2-7.7-.1-12.7 3-15.2 9.2M23 29c-5.8-.8-9.4-3.8-10.6-8.8 5.7 0 9.4 2.4 11.2 7M25 22c5.1-.8 8.3-3.5 9.7-8-5 0-8.3 2.1-9.9 6.3" />
        <path d="M14 58h20" />
      </>
    );
  }

  if (artwork === "crossed-axes" || artwork === "crown-blade") {
    return (
      <>
        <path d="m10 16 8 1 4.5 5-5.5 5-7.6-1 4-5-3.4-5Zm28 0-8 1-4.5 5 5.5 5 7.6-1-4-5 3.4-5Z" />
        <path d="M19 25 36 54m-7-29L12 54M15 57h18" />
        <path d="m24 8 1 2.7 2.8 1-2.8 1-1 2.7-1-2.7-2.8-1 2.8-1L24 8Z" />
      </>
    );
  }

  if (artwork === "serpent-rose" || artwork === "thorn-heart" || artwork === "heart-vine" || artwork === "lips") {
    return (
      <>
        <path d="M24 48S8 38.5 8 24c0-11.4 13.5-12.6 16-3 2.5-9.6 16-8.4 16 3 0 14.5-16 24-16 24Z" />
        <path d="M3 19c9.2 1.8 16.2 7.5 21 17.2C28.8 26.5 35.8 20.8 45 19" />
        <path d="m8 19-4-6m36 6 4-6M17 53h14" />
      </>
    );
  }

  if (artwork === "mountain-pines" || artwork === "frost-mountain") {
    return (
      <>
        <path d="M3 34 14 22l7 8 7-13 17 17H3Z" />
        <path d="m28 17 7 8 3-2M7 35h36" />
        <path d="M10 55V36m0 6-5-4m5 9 5-4M24 57V34m0 8-6-4.5m6 10.5 6-4.8M40 55V35m0 7-5-4m5 9 5-4" />
      </>
    );
  }

  if (artwork === "playing-cards") {
    return (
      <>
        <rect x="7" y="13" width="24" height="36" rx="2" transform="rotate(-9 19 31)" />
        <rect x="19" y="13" width="24" height="36" rx="2" transform="rotate(9 31 31)" />
        <path d="M24 39s-7-4-7-9c0-4 5.8-4.5 7-1 1.2-3.5 7-3 7 1 0 5-7 9-7 9Z" />
        <path d="M15 56h18" />
      </>
    );
  }

  if (artwork === "sealed-letter") {
    return (
      <>
        <rect x="6" y="15" width="36" height="31" rx="2" />
        <path d="m7 18 17 14 17-14M7 44l13-15m21 15L28 29" />
        <circle data-art-accent="true" cx="24" cy="33" r="4.5" />
        <path d="M14 54h20" />
      </>
    );
  }

  if (artwork === "wedding-rings") {
    return (
      <>
        <circle cx="18" cy="33" r="11" />
        <circle cx="30" cy="33" r="11" />
        <path data-art-accent="true" d="m30 10 5 7-5 5-5-5 5-7Zm-5 7h10" />
        <path d="M13 54h22" />
      </>
    );
  }

  if (artwork === "hockey-heart" || artwork === "crossed-sticks") {
    return (
      <>
        <path d="M10 11c3.5 12 9 24 20 39l8 1-3 5-8-2C17 40 10 26 6 13l4-2Zm28 0c-3.5 12-9 24-20 39l-8 1 3 5 8-2c10-14 17-28 21-41l-4-2Z" />
        <ellipse cx="24" cy="43" rx="5.5" ry="2.2" />
      </>
    );
  }

  return (
    <>
      <path d="M4 28c5.5-7.5 12.2-11.2 20-11.2S38.5 20.5 44 28c-5.5 7.5-12.2 11.2-20 11.2S9.5 35.5 4 28Z" />
      <circle cx="24" cy="28" r="6.5" />
      <circle cx="24" cy="28" r="2" fill="currentColor" stroke="none" />
      <path d="M24 5v8m0 30v12M12 55h24" />
    </>
  );
}

export function SpineOrnament({ artwork, className, variant = "primary" }: SpineOrnamentProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={variant === "primary" ? 1.08 : 1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {variant === "primary" ? (
        <>
          <IllustrationWash artwork={artwork} />
          <PrimaryOrnament artwork={artwork} />
          <EngravingDetail artwork={artwork} />
        </>
      ) : (
        <SecondaryOrnament artwork={artwork} />
      )}
    </svg>
  );
}
