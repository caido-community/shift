import typography from '@tailwindcss/typography'

export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      typography: {
        compact: {
          css: {
            lineHeight: '1.3',
            p: { margin: '0.4em 0' },
            ul: { margin: '0.25em 0', paddingInlineStart: '1em' },
            ol: { margin: '0.25em 0', paddingInlineStart: '1.8em' },
            li: { margin: '0.1em 0', padding: "0" },
            h1: { margin: '0.7em 0', fontSize: '1.15rem' },
            h2: { margin: '0.6em 0', fontSize: '1.05rem' },
            h3: { margin: '0.5em 0', fontSize: '1rem' },
            pre: { margin: '0.4em 0', padding: '0.7em' },
            blockquote: { margin: '0.5em 0', paddingLeft: '1em' },
            code: {
              backgroundColor: 'rgba(0,0,0,0.25)',
              padding: '0.1rem 0.4rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              borderRadius: '0',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
          },
        },
      },
    },
  },
  plugins: [typography],
}
