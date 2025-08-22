module.exports = {
  root: true, // Ajoutez cette ligne
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  env: {
    node: true,
  },
  rules: {
    // Personnalisez vos règles ici si nécessaire
  },
};