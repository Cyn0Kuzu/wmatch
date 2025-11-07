import { Alert } from 'react-native';
import { logger } from './Logger';

// Set a global error handler
const defaultErrorHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  logger.error('Global unhandled error:', 'GlobalErrorHandler', { error, isFatal });

  // Show a user-friendly alert
  if (isFatal) {
    Alert.alert(
      'Unexpected Error',
      'An unexpected error occurred. Please restart the app.',
      [{ text: 'OK' }]
    );
  }

  // Call the default error handler
  if (defaultErrorHandler) {
    defaultErrorHandler(error, isFatal);
  }
});

// Set a global promise rejection handler
// Note: This is a bit of a hack for React Native, as there isn't a single standard way
const rejectionHandler = (id: any, error: any) => {
  logger.error(`Unhandled promise rejection (id: ${id}):`, 'GlobalErrorHandler', { error });
};

// @ts-ignore
const tracking = require('promise/setimmediate/rejection-tracking');
tracking.enable({
  allRejections: true,
  onUnhandled: rejectionHandler,
  onHandled: () => {},
});

export const globalErrorHandler = {
  initialize: () => {
    logger.info('Global error handler initialized', 'GlobalErrorHandler');
  },
};
