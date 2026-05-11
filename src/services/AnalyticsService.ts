import {
  HttpClient,
  AnalyticsEvent,
  AnalyticsBatch,
  AnalyticsResponse,
  AnalyticsHealthResponse,
  RequestConfig,
} from "../types/api";

export class AnalyticsService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Submit a single analytics event
   */
  async submitEvent(
    event: AnalyticsEvent,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    return this.httpClient.post<AnalyticsResponse>(
      "/api/analytics/events",
      event,
      config,
    );
  }

  /**
   * Submit multiple analytics events in batch
   */
  async submitEvents(
    events: AnalyticsEvent[],
    context?: AnalyticsBatch["context"],
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const batch: AnalyticsBatch = {
      events,
      batch: true,
      context,
    };

    return this.httpClient.post<AnalyticsResponse>(
      "/api/analytics/events",
      batch,
      config,
    );
  }

  /**
   * Submit analytics events as an array (simplified batch)
   */
  async submitEventsBatch(
    events: AnalyticsEvent[],
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    return this.httpClient.post<AnalyticsResponse>(
      "/api/analytics/events",
      events,
      config,
    );
  }

  /**
   * Get analytics service health status
   */
  async getHealth(config?: RequestConfig): Promise<AnalyticsHealthResponse> {
    return this.httpClient.get<AnalyticsHealthResponse>(
      "/api/analytics/events",
      config,
    );
  }

  /**
   * Track a user event with automatic context enrichment
   */
  async trackUser(
    eventName: string,
    properties?: Record<string, unknown>,
    userId?: string,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: eventName,
      category: "user",
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track a system event
   */
  async trackSystem(
    eventName: string,
    properties?: Record<string, unknown>,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: eventName,
      category: "system",
      properties,
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track a performance event
   */
  async trackPerformance(
    eventName: string,
    metrics: {
      duration?: number;
      loadTime?: number;
      responseTime?: number;
      [key: string]: number | undefined;
    },
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: eventName,
      category: "performance",
      properties: metrics,
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track a business event
   */
  async trackBusiness(
    eventName: string,
    properties?: Record<string, unknown>,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: eventName,
      category: "business",
      properties,
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track an error event
   */
  async trackError(
    error: Error | string,
    context?: Record<string, unknown>,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const errorData =
      typeof error === "string"
        ? { message: error }
        : {
            message: error.message,
            name: error.name,
            stack: error.stack,
          };

    const event: AnalyticsEvent = {
      name: "error_occurred",
      category: "error",
      properties: {
        ...errorData,
        ...context,
      },
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track page view
   */
  async trackPageView(
    url: string,
    title?: string,
    referrer?: string,
    loadTime?: number,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: "page_loaded",
      category: "user",
      properties: {
        url,
        title,
        referrer,
        loadTime,
      },
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track API request
   */
  async trackAPIRequest(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: "api_request",
      category: "system",
      properties: {
        endpoint,
        method: method.toUpperCase(),
        duration,
        status,
        success: status >= 200 && status < 300,
      },
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(
    feature: string,
    action: string,
    properties?: Record<string, unknown>,
    userId?: string,
    config?: RequestConfig,
  ): Promise<AnalyticsResponse> {
    const event: AnalyticsEvent = {
      name: "feature_used",
      category: "user",
      properties: {
        feature,
        action,
        ...properties,
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    return this.submitEvent(event, config);
  }

  /**
   * Create a batch event tracker for efficient bulk operations
   */
  createBatchTracker(
    flushThreshold = 10,
    flushInterval = 5000,
  ): BatchEventTracker {
    return new BatchEventTracker(this, flushThreshold, flushInterval);
  }
}

/**
 * Batch event tracker for efficient bulk event submission
 */
export class BatchEventTracker {
  private events: AnalyticsEvent[] = [];
  private timer?: NodeJS.Timeout;

  constructor(
    private analyticsService: AnalyticsService,
    private flushThreshold: number = 10,
    private flushInterval: number = 5000,
  ) {}

  /**
   * Add event to batch
   */
  track(event: AnalyticsEvent): void {
    this.events.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    if (this.events.length >= this.flushThreshold) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<AnalyticsResponse | null> {
    if (this.events.length === 0) return null;

    const eventsToSubmit = [...this.events];
    this.events = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    try {
      return await this.analyticsService.submitEvents(eventsToSubmit);
    } catch (error) {
      // Re-queue events if submission fails
      this.events.unshift(...eventsToSubmit);
      throw error;
    }
  }

  /**
   * Get number of pending events
   */
  getPendingCount(): number {
    return this.events.length;
  }

  /**
   * Schedule automatic flush
   */
  private scheduleFlush(): void {
    if (this.timer) return;

    this.timer = setTimeout(() => {
      this.flush().catch(console.error);
    }, this.flushInterval);
  }

  /**
   * Destroy the tracker and flush remaining events
   */
  async destroy(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.events.length > 0) {
      await this.flush();
    }
  }
}
