// uuid needs crypto.getRandomValues, which Hermes doesn't provide out of the
// box - this polyfill must load before anything else touches uuid.
import "react-native-get-random-values";
import "expo-router/entry";
