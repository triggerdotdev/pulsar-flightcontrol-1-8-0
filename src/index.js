const Pulsar = require("pulsar-client");
const SegfaultHandler = require("segfault-handler");

SegfaultHandler.registerHandler("crash.log");

(async () => {
  Pulsar.Client.setLogHandler((level, file, line, message) => {
    console.log("[%s][%s:%d] %s", level, file, line, message);
  });

  const auth = new Pulsar.AuthenticationOauth2({
    type: "sn_service_account",
    client_id: process.env.PULSAR_CLIENT_ID,
    client_secret: process.env.PULSAR_CLIENT_SECRET,
    issuer_url: process.env.PULSAR_ISSUER_URL,
    audience: process.env.PULSAR_AUDIENCE,
  });

  console.log("Authenticating with OAuth2");

  // Create a client
  const client = new Pulsar.Client({
    serviceUrl: process.env.PULSAR_SERVICE_URL,
    authentication: auth,
    tlsTrustCertsFilePath: "../ca-certificates.crt",
  });

  console.log("Client created");

  // Create a consumer
  const consumer = await client.subscribe({
    topic: "persistent://public/default/my-topic",
    subscription: "sub1",
    subscriptionType: "Shared",
  });

  console.log("Consumer created");

  const producer = await client.createProducer({
    topic: "persistent://public/default/my-topic",
    sendTimeoutMs: 30000,
    batchingEnabled: true,
  });

  console.log("Producer created");

  for (let i = 0; i < 10; i += 1) {
    const msg = `my-message-${i}`;
    producer.send({
      data: Buffer.from(msg),
    });
    console.log(`Sent message: ${msg}`);
  }
  await producer.flush();

  // Receive messages
  for (let i = 0; i < 10; i += 1) {
    const msg = await consumer.receive();
    console.log(msg.getData().toString());
    consumer.acknowledge(msg);
  }

  await producer.close();
  await consumer.close();
  await client.close();
})();
