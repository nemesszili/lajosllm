FROM node:20-alpine

# The Firestore emulator is a Java application.
RUN apk add --no-cache openjdk21-jre-headless \
  && npm install -g firebase-tools@15.37.0

WORKDIR /app
COPY firebase/firebase.json firebase/firestore.rules firebase/firestore.indexes.json ./
COPY firebase/seed.js ./seed.js
COPY shared ./shared

EXPOSE 8080

CMD ["firebase", "emulators:start", "--only", "firestore", "--project", "demo-lajosllm"]
