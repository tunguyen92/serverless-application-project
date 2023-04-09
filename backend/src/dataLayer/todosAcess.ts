import * as AWS from 'aws-sdk'
// import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)
const logger = createLogger('TodosAccess')
const s3BucketName = process.env.ATTACHMENT_S3_BUCKET

// TODO: Implement the dataLayer logic
export class TodosAccess {
  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todosIndex = process.env.INDEX_NAME,
    private readonly bucketName = s3BucketName
  ) {}

  async getAllTodos(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todo')

    const params = {
      TableName: this.todosTable,
      IndexName: this.todosIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }

    const result = await this.docClient.query(params).promise()
    const items = result.Items
    return items as TodoItem[]
  }

  async createTodoItem(todoItem: TodoItem): Promise<TodoItem> {
    logger.info('Creating new todo')

    const params = {
      TableName: this.todosTable,
      Item: todoItem
    }

    const result = await this.docClient.put(params).promise()
    logger.info('Todo item created', result)
    return todoItem as TodoItem
  }

  async updateTodoItem(
    userId: string,
    todoId: string,
    todoUpdate: TodoUpdate
  ): Promise<TodoUpdate> {
    logger.info('Updating todo')

    const params = {
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeValues: {
        ':name': todoUpdate.name,
        ':dueDate': todoUpdate.dueDate,
        ':done': todoUpdate.done
      },
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ReturnValues: 'UPDATED_NEW'
    }

    await this.docClient.update(params).promise()
    return todoUpdate as TodoUpdate
  }

  async deleteTodoItem(userId: string, todoId: string): Promise<string> {
    logger.info('Deleting todo')

    const params = {
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      }
    }

    await this.docClient.delete(params).promise()
    return todoId as string
  }

  async updateTodoAttachmentUrl(userId: string, todoId: string) {
    logger.info('Updating todo attachment url')
    const s3AttachmentUrl = `https://${this.bucketName}.s3.amazonaws.com/${todoId}`

    const params = {
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': s3AttachmentUrl
      },
      ReturnValues: 'UPDATED_NEW'
    }

    await this.docClient.update(params).promise()
  }

  async getTodoItemWithPagination(
    userId: string,
    nextKey: JSON,
    limit: number
  ) {
    logger.info(`Getting all Todo items with pagination`)

    const params = {
      TableName: this.todosTable,
      Limit: limit,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ExclusiveStartKey: nextKey,
      ScanIndexForward: false
    }
    return await this.docClient.query(params).promise()
  }
}
