 /** @type {import('tailwindcss').Config} */
 module.exports = {
     content: ["./templates/**/*.html", "./**/templates/**/*.html", "./node_modules/flyonui/dist/js/*.js"],
     darkMode: "media",
     theme: {
         extend: {},
     },
     plugins: [
        require("flyonui"),
        require("flyonui/plugin")
    ]
 };