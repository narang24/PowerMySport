/**
 * kafkaAdmin.ts
 *
 * One-shot script to create / verify the Kafka topics required by the
 * community message pipeline.
 *
 * Usage:
 *   ts-node src/scripts/kafkaAdmin.ts
 *
 * Safe to run multiple times — uses createTopics({ validateOnly: false })
 * which is a no-op if the topic already exists.
 */

import "dotenv/config";
import { createKafkaClient, COMMUNITY_MESSAGES_TOPIC } from "../config/kafka";

const NUM_PARTITIONS = 3;
const REPLICATION_FACTOR = 1; // 1 for local dev; set to ≥2 in production

async function main() {
  console.log("🔧 Kafka Admin — ensuring required topics exist...");
  console.log(
    `   Broker(s): ${process.env.KAFKA_BROKERS || "localhost:9092"}`,
  );

  const kafka = createKafkaClient();
  const admin = kafka.admin();

  try {
    await admin.connect();
    console.log("✅ Connected to Kafka broker");

    // List existing topics so we can report what was already there
    const existingTopics = await admin.listTopics();
    console.log(`   Existing topics (${existingTopics.length}):`, existingTopics);

    const topicsToCreate = [
      {
        topic: COMMUNITY_MESSAGES_TOPIC,
        numPartitions: NUM_PARTITIONS,
        replicationFactor: REPLICATION_FACTOR,
        configEntries: [
          // Keep messages for 24 hours — enough for a consumer restart window
          { name: "retention.ms", value: String(24 * 60 * 60 * 1000) },
          // Compact + delete so old messages are cleaned up
          { name: "cleanup.policy", value: "delete" },
        ],
      },
    ];

    const result = await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
      timeout: 10_000,
    });

    if (result) {
      console.log(`✅ Created topic: ${COMMUNITY_MESSAGES_TOPIC}`);
    } else {
      console.log(
        `ℹ️  Topic already exists (no-op): ${COMMUNITY_MESSAGES_TOPIC}`,
      );
    }

    // Describe topic to confirm partition count
    const metadata = await admin.fetchTopicMetadata({
      topics: [COMMUNITY_MESSAGES_TOPIC],
    });

    for (const topic of metadata.topics) {
      console.log(
        `   📋 Topic "${topic.name}" — ${topic.partitions.length} partition(s)`,
      );
      for (const partition of topic.partitions.sort(
        (a, b) => a.partitionId - b.partitionId,
      )) {
        console.log(
          `      Partition ${partition.partitionId}: leader=${partition.leader}, replicas=[${partition.replicas.join(",")}]`,
        );
      }
    }

    console.log("\n✅ Kafka topic setup complete.\n");
  } catch (err) {
    console.error("❌ Kafka admin error:", err);
    process.exit(1);
  } finally {
    await admin.disconnect();
  }
}

main();
