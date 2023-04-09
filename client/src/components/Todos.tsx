import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  Loader,
  Table,
  Pagination
} from 'semantic-ui-react'

import {
  createTodo,
  deleteTodo,
  getTodos,
  getTodosWithPagination,
  patchTodo
} from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'
import { limitPagination } from '../config'
import noImage from '../assets/no-image.jpg'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  todos: Todo[]
  todosPagination: Todo[]
  nextKey: string
  newTodoName: string
  loadingTodos: boolean
}

export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    todos: [],
    todosPagination: [],
    nextKey: '',
    newTodoName: '',
    loadingTodos: true
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }

  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      const dueDate = this.calculateDueDate()
      const newTodo = await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate
      })
      this.setState({
        todos: [...this.state.todos, newTodo],
        todosPagination: [...this.state.todosPagination, newTodo],
        newTodoName: ''
      })

      alert('Todo creation succeed')
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({
        todos: this.state.todos.filter((todo) => todo.todoId !== todoId),
        todosPagination: this.state.todosPagination.filter(
          (todo) => todo.todoId !== todoId
        )
      })
      alert('Todo deletion succeed')
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todosPagination[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        done: !todo.done
      })
      this.setState({
        todosPagination: update(this.state.todosPagination, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoPagination = async () => {
    try {
      const todosAnotherPagination = await getTodosWithPagination(
        this.props.auth.getIdToken(),
        this.state.nextKey
      )
      const { items, nextKey } = todosAnotherPagination
      this.setState({
        todosPagination: items,
        nextKey,
        loadingTodos: false
      })
    } catch (error) {
      alert('Failed to fetch todos pagination')
    }
  }

  async componentDidMount() {
    try {
      const todos = await getTodos(this.props.auth.getIdToken())
      const todosWithPagination = await getTodosWithPagination(
        this.props.auth.getIdToken(),
        null
      )
      const { items, nextKey } = todosWithPagination
      this.setState({
        todos,
        todosPagination: items,
        nextKey,
        loadingTodos: false
      })
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  render() {
    return (
      <div>
        <Header as="h1">TODOs</Header>

        {this.renderCreateTodoInput()}

        {this.renderTodos()}
      </div>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'New task',
              onClick: this.onTodoCreate
            }}
            fluid
            actionPosition="left"
            placeholder="To change the world..."
            onChange={this.handleNameChange}
          />
        </Grid.Column>
        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos) {
      return this.renderLoading()
    }

    return this.renderTodosList()
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline="centered">
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    const numberOfTodos = this.state.todos.length

    return (
      <Table compact celled>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell textAlign="center">Completed</Table.HeaderCell>
            <Table.HeaderCell textAlign="center">Image</Table.HeaderCell>
            <Table.HeaderCell>Todo Name</Table.HeaderCell>
            <Table.HeaderCell textAlign="center">Due Date</Table.HeaderCell>
            <Table.HeaderCell textAlign="center">Edit</Table.HeaderCell>
            <Table.HeaderCell textAlign="center">Delete</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {this.state.todosPagination.length > 0 &&
            this.state.todosPagination.map((todo, pos) => {
              return (
                <Table.Row key={todo.createdAt}>
                  <Table.Cell collapsing textAlign="center">
                    <Checkbox
                      slider
                      onChange={() => this.onTodoCheck(pos)}
                      checked={todo.done}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Image
                      src={todo.attachmentUrl ? todo.attachmentUrl : noImage}
                      size="tiny"
                      style={{ margin: 'auto' }}
                    />
                  </Table.Cell>
                  <Table.Cell>{todo.name}</Table.Cell>
                  <Table.Cell textAlign="center">{todo.dueDate}</Table.Cell>
                  <Table.Cell textAlign="center">
                    <Button
                      icon
                      color="blue"
                      onClick={() => this.onEditButtonClick(todo.todoId)}
                    >
                      <Icon name="pencil" />
                    </Button>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Button
                      icon
                      color="red"
                      onClick={() => this.onTodoDelete(todo.todoId)}
                    >
                      <Icon name="delete" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              )
            })}
        </Table.Body>

        <Table.Footer fullWidth>
          <Table.Row>
            <Table.HeaderCell textAlign="center">
              <p>Pagination</p>
              <p>{limitPagination}tasks/page</p>
            </Table.HeaderCell>
            <Table.HeaderCell colSpan="4">
              <Pagination
                floated="right"
                defaultActivePage={1}
                totalPages={numberOfTodos / limitPagination}
                firstItem={null}
                lastItem={null}
                pageItem={null}
                onPageChange={this.onTodoPagination}
              />
            </Table.HeaderCell>
            <Table.HeaderCell textAlign="center">
              <p>Total todos: {numberOfTodos}</p>
              <p>Total pages: {Math.round(numberOfTodos / limitPagination)}</p>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Footer>
      </Table>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
