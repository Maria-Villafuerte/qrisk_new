/**
 * Configuracion de Babel. El proyecto no la necesitaba porque Expo aplica sus
 * valores por defecto, pero jest-expo si la requiere para transformar los
 * modulos de React Native al correr las pruebas.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
