import { 
  GetItemCommand, 
  PutItemCommand, 
  UpdateItemCommand, 
  DeleteItemCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand as DocQueryCommand, 
  ScanCommand as DocScanCommand,
  BatchGetCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB Configuration
 */
export const config = {
  // Environment variables
  tableName: process.env.DYNAMODB_TABLE || 'booking-system',
  region: process.env.AWS_REGION || 'us-east-1',
  
  // Entity prefixes for partition keys
  entities: {
    template: 'TPL',
    bookingLink: 'BL', 
    booking: 'BKG',
    monthAvailability: 'MONTH'
  },
  
  // Sort key patterns
  sortKeys: {
    metadata: 'METADATA',
    booking: 'BOOKING',
    availability: 'AVAILABILITY',
    overview: 'OVERVIEW'
  },
  
  // GSI names
  indexes: {
    entityType: 'EntityType-Index',  // For querying by entity type
    dateIndex: 'Date-Index',         // For date-based queries
    slugIndex: 'Slug-Index'          // For URL slug lookups
  },
  
  // TTL settings (in seconds)
  ttl: {
    availability: 60 * 60 * 24 * 180, // 6 months
    cache: 60 * 60 * 24 * 7           // 1 week
  }
};

/**
 * DynamoDB Table Schema Design
 * 
 * Single Table Design:
 * 
 * Templates:
 * PK: TPL_<timestamp>_<random>
 * SK: METADATA
 * GSI1PK: TEMPLATE
 * 
 * Booking Links:
 * PK: BL_<timestamp>_<random>  
 * SK: METADATA
 * GSI1PK: BOOKING_LINK
 * GSI2PK: <urlSlug>  (for slug lookup)
 * 
 * Bookings:
 * PK: BL_<bookingLinkId>
 * SK: BOOKING#<date>#<time>
 * GSI1PK: BKG_<bookingId>
 * 
 * Month Availability (Pre-calculated):
 * PK: MONTH#<bookingLinkId>#<YYYY-MM>
 * SK: OVERVIEW
 * TTL: <expiration>
 */

/**
 * Base database operations class
 */
export class DynamoDBBase {
  constructor(dynamoClient) {
    this.client = dynamoClient;
    this.tableName = config.tableName;
  }

  /**
   * Get single item by primary key
   */
  async getItem(pk, sk) {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      });
      
      const response = await this.client.send(command);
      return response.Item || null;
    } catch (error) {
      console.error('DynamoDB getItem error:', error);
      throw new Error(`Failed to get item: ${error.message}`);
    }
  }

  /**
   * Put single item
   */
  async putItem(item) {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item
      });
      
      await this.client.send(command);
      return item;
    } catch (error) {
      console.error('DynamoDB putItem error:', error);
      throw new Error(`Failed to put item: ${error.message}`);
    }
  }

  /**
   * Update item with condition
   */
  async updateItem(pk, sk, updateExpression, expressionValues, conditionExpression = null) {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ...(conditionExpression && { ConditionExpression: conditionExpression }),
        ReturnValues: 'ALL_NEW'
      });
      
      const response = await this.client.send(command);
      return response.Attributes;
    } catch (error) {
      console.error('DynamoDB updateItem error:', error);
      throw new Error(`Failed to update item: ${error.message}`);
    }
  }

  /**
   * Delete single item
   */
  async deleteItem(pk, sk) {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        ReturnValues: 'ALL_OLD'
      });
      
      const response = await this.client.send(command);
      return response.Attributes;
    } catch (error) {
      console.error('DynamoDB deleteItem error:', error);
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  /**
   * Query items by partition key
   */
  async query(pk, skCondition = null, indexName = null, limit = null) {
    try {
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pk }
      };

      if (skCondition) {
        params.KeyConditionExpression += ` AND ${skCondition.expression}`;
        Object.assign(params.ExpressionAttributeValues, skCondition.values);
        
        if (skCondition.attributeNames) {
          params.ExpressionAttributeNames = skCondition.attributeNames;
        }
      }

      if (indexName) {
        params.IndexName = indexName;
      }

      if (limit) {
        params.Limit = limit;
      }

      const command = new DocQueryCommand(params);
      const response = await this.client.send(command);
      
      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        count: response.Count
      };
    } catch (error) {
      console.error('DynamoDB query error:', error);
      throw new Error(`Failed to query items: ${error.message}`);
    }
  }

  /**
   * Scan table with filters
   */
  async scan(filterExpression = null, expressionValues = null, limit = null) {
    try {
      const params = {
        TableName: this.tableName
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionValues;
      }

      if (limit) {
        params.Limit = limit;
      }

      const command = new DocScanCommand(params);
      const response = await this.client.send(command);
      
      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        count: response.Count
      };
    } catch (error) {
      console.error('DynamoDB scan error:', error);
      throw new Error(`Failed to scan table: ${error.message}`);
    }
  }

  /**
   * Batch get multiple items
   */
  async batchGet(keys) {
    try {
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys
          }
        }
      });
      
      const response = await this.client.send(command);
      return response.Responses[this.tableName] || [];
    } catch (error) {
      console.error('DynamoDB batchGet error:', error);
      throw new Error(`Failed to batch get items: ${error.message}`);
    }
  }

  /**
   * Batch write (put/delete) multiple items
   */
  async batchWrite(puts = [], deletes = []) {
    try {
      const requestItems = [];
      
      puts.forEach(item => {
        requestItems.push({
          PutRequest: { Item: item }
        });
      });
      
      deletes.forEach(key => {
        requestItems.push({
          DeleteRequest: { Key: key }
        });
      });

      if (requestItems.length === 0) return;

      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: requestItems
        }
      });
      
      await this.client.send(command);
    } catch (error) {
      console.error('DynamoDB batchWrite error:', error);
      throw new Error(`Failed to batch write items: ${error.message}`);
    }
  }

  /**
   * Query by GSI
   */
  async queryGSI(indexName, gsiPk, gsiSkCondition = null, limit = null) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: { ':gsi1pk': gsiPk }
      };

      if (gsiSkCondition) {
        params.KeyConditionExpression += ` AND ${gsiSkCondition.expression}`;
        Object.assign(params.ExpressionAttributeValues, gsiSkCondition.values);
      }

      if (limit) {
        params.Limit = limit;
      }

      const command = new DocQueryCommand(params);
      const response = await this.client.send(command);
      
      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        count: response.Count
      };
    } catch (error) {
      console.error('DynamoDB queryGSI error:', error);
      throw new Error(`Failed to query GSI: ${error.message}`);
    }
  }

  /**
   * Generate TTL timestamp
   */
  generateTTL(daysFromNow) {
    return Math.floor(Date.now() / 1000) + (daysFromNow * 24 * 60 * 60);
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse date from YYYY-MM-DD
   */
  parseDate(dateString) {
    return new Date(dateString + 'T00:00:00.000Z');
  }
}

/**
 * Create error response helper
 */
export function createErrorResponse(statusCode, error, details) {
  return {
    statusCode,
    body: {
      error,
      details
    }
  };
}

/**
 * Create success response helper
 */
export function createSuccessResponse(statusCode, data, message = null) {
  const body = message ? { message, ...data } : data;
  return {
    statusCode,
    body
  };
}