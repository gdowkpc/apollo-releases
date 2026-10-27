# Windows stable Build 375

Windows v2.3.162 / Build 375 uses the canonical tag `apollo-passive-v2.3.162-build.375`. The archive is `ApolloPassiveReceive-2.3.162-build.375-windows-x64.zip`, 53,745,555 bytes, SHA-256 `845dc566aeb4d12ba39d589e6fd9a68eb3f3ed3909cebc3ba852ba13545fffca`, from Apollo source `d8ce77023d4c1bbdaf0815d99c283bc1bc7eb344`. The reviewed qualification record binds the archive, inventory, executable and evidence. Publish the Windows ZIP, checksum and qualification review together before sealing the immutable release.

Windows stable discovery remains the existing `stable/apollo-passive-receive-windows-x64.json` contract. Its canonical URLs, size, SHA-256 and embedded release identity must agree with the immutable asset. The Windows worker requires an owner action to install; publication does not install customer nodes. The Linux/ARM64 provenance and Pi qualification contracts remain separate.

Package checks and the actual owned Windows installation were qualified. Independent observations showed all four saved RF ranges advancing, 21 additional successful sweeps without new failures, reporting ready and an empty queue. The normal return to Build 370 also preserved protected state and restored advancing scans. The trial script had a UTC/local-time comparison defect; its failed gate is retained and is not reported as a passing scripted gate. Independent receiver evidence is recorded separately.

Fresh Build 375 RF-to-server delivery was not observed during the bounded trial. Build 370 delivery and unchanged installer/recovery evidence are historical coverage, not a fresh Build 375 RF claim. Repeated clean zero-sample diagnosis and automatic fault escalation remain unqualified. No reboot, induced fault or customer deployment occurred.
