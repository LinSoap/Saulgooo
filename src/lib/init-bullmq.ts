/**
 * BullMQ 初始化文件
 * 在服务器启动时自动导入，初始化队列和 Worker
 */

// 导入队列和 Worker，它们会自动启动
import './queue';
import './worker';

console.log('✅ BullMQ initialized');
console.log('   - Queue: agent-tasks');
console.log('   - Worker: running with concurrency 2');