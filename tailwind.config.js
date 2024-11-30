 /** @type {import('tailwindcss').Config} */
 module.exports = {
     content: ["./templates/**/*.html", "./**/templates/**/*.html", ],
     darkMode: "media",
     theme: {
         extend: {
             container: {
              center: true,
            },
         },
     },
     plugins: [
        require("@tailwindcss/typography"),
        require('daisyui'),
        require('tailwindcss-motion'),
    ],
 };