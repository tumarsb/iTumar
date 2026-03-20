import React from 'react';

export default function TumarBranding({ dark = false }) {
  const textColor = dark ? 'rgba(255,255,255,0.45)' : '#aaa';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#eee';
  const linkColor = dark ? 'rgba(255,255,255,0.6)' : '#888';

  return (
    <div style={{
      borderTop: `1px solid ${borderColor}`,
      paddingTop: 10,
      marginTop: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
    }}>
      <img
        src="/tumar_logo.png"
        alt="Tumar"
        style={{
          width: 22,
          height: 22,
          objectFit: 'contain',
          opacity: dark ? 0.7 : 0.85,
          borderRadius: 3,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: textColor, lineHeight: 1.4 }}>
          Developed by <strong style={{ color: linkColor }}>TUMAR</strong>
        </div>
        <a
          href="https://wa.me/87018647142"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10, color: linkColor, textDecoration: 'none', lineHeight: 1.4 }}
        >
          +8 701 864 7142
        </a>
      </div>
    </div>
  );
}
