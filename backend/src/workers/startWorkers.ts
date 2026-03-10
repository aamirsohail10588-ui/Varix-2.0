import "./ingestion.worker";
import { startSnapshotGraphWorker } from "./snapshotGraph.worker";

console.log("VARIX Workers Running");
startSnapshotGraphWorker();