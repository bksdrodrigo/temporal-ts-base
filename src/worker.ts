import {
  appendDefaultInterceptors,
  DefaultLogger,
  defaultSinks,
  Logger,
  LogLevel,
  LogMetadata,
  makeTelemetryFilterString,
  Runtime,
  Worker,
} from '@temporalio/worker';
import * as activities from './activities';
import { ActivityInboundLogInterceptor } from './activities/interceptors';
import { createLogger } from './logging';

const logger = createLogger({
  isProduction: process.env.NODE_ENV === 'production',
  logFilePath: process.env.WORKER_LOG_PATH || '/var/log/worker.log',
});

async function main() {
  // Create loggers with different labels for the separate components
  const workerWinstonLogger = logger.child({ label: 'worker' });
  const workflowWinstonLogger = logger.child({ label: 'workflow' });
  const activityWinstonLogger = logger.child({ label: 'activity' });

  // @@@SNIPSTART typescript-core-telemetry-options
  // Configure Rust Core runtime to export SDK logs, metrics and (optionally) internal traces
  Runtime.install({
    // Install a logger to collect logs generated by Node.js Workers and Rust Core.
    logger: new DefaultLogger('DEBUG', (entry) => {
      workerWinstonLogger.log({
        level: entry.level.toLowerCase(),
        message: entry.message,
        timestamp: Number(entry.timestampNanos / 1_000_000n),
        ...entry.meta,
      });
    }),
    // Telemetry options control how logs, metrics and traces are exported out of Rust Core
    telemetryOptions: {
      // To export metrics and traces using the OpenTelemetry Collector, set `tracing.otel` or `metrics.otel`.
      // see https://opentelemetry.io/docs/collector/getting-started/ for more information.
      //
      // Expose a port for Prometheus to collect metrics from Core.
      // You can verify metrics are exported with `curl -fail localhost:9464/metrics`.
      metrics: {
        prometheus: { bindAddress: '0.0.0.0:9464' },
      },
      // By default, Core logs go directly to console.
      logging: {
        // What level, if any, logs should be forwarded from Rust Core to the Node.js logger.
        filter: makeTelemetryFilterString({ core: 'DEBUG' }),
        forward: {},
      },
    },
  });
  // @@@SNIPEND

  // The Worker side of our logger sinks, forwards logs from Workflows to a Winston logger
  const workflowLogger: Logger = {
    log(level: LogLevel, message: string, meta?: LogMetadata) {
      workflowWinstonLogger.log(message, meta);
    },
    trace(message: string, meta?: LogMetadata) {
      workflowWinstonLogger.verbose(message, meta);
    },
    debug(message: string, meta?: LogMetadata) {
      workflowWinstonLogger.debug(message, meta);
    },
    info(message: string, meta?: LogMetadata) {
      workflowWinstonLogger.info(message, meta);
    },
    warn(message: string, meta?: LogMetadata) {
      workflowWinstonLogger.warn(message, meta);
    },
    error(message: string, meta?: LogMetadata) {
      workflowWinstonLogger.error(message, meta);
    },
  };

  // @@@SNIPSTART typescript-worker-full-logging-setup
  // Create a worker that uses the Runtime instance installed above
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'instrumentation',
    // Install interceptors
    interceptors: appendDefaultInterceptors(
      {
        activityInbound: [(ctx) => new ActivityInboundLogInterceptor(ctx, activityWinstonLogger)],
        // workflowModules: [require.resolve('./workflows/interceptors')],
      },
      workflowLogger
    ),
    // Inject sinks
    sinks: defaultSinks(workflowLogger),
  });
  // @@@SNIPEND
  await worker.run();
}

main().then(
  () => void process.exit(0),
  (err) => {
    logger.error('Process failed', err);
    process.exit(1);
  }
);