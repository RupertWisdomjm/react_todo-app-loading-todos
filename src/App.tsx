/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { client } from './utils/fetchClient';
import { Todo } from './types/Todo';
import { getTodos } from './api/todos';

export const App: React.FC = () => {
  if (!USER_ID) {
    return <UserWarning />;
  }

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Load todos on component mount
  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
    inputRef.current?.focus();
  }, []);

  // Log todos to verify they are loaded correctly
  console.log(todos);

  const getTotalActiveTodos = () => {
    return todos.filter(todo => !todo.completed).length;
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });
  // Add a new todo
  const addTodo = async () => {
    // Get the trimmed value from the input field
    const value = inputRef.current?.value.trim();

    if (!value) {
      return;
    }

    const tempTodo: Todo = {
      id: 0,
      userId: USER_ID,
      title: value,
      completed: false,
    };
    setTodos(prev => [...prev, tempTodo]);
    setLoadingId(0);

    const newTodo: Omit<Todo, 'id'> = {
      userId: USER_ID,
      title: value,
      completed: false,
    };

    try {
      const savedTodo = await client.post<Todo>('/todos', newTodo);
      setTodos(prev => prev.map(t => (t.id === 0 ? savedTodo : t)));
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      setTodos(prev => prev.filter(t => t.id !== 0));
      setErrorMessage('Unable to add a todo');
      throw error;
    } finally {
      setLoadingId(null);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    setLoadingId(todo.id);
    try {
      const updated = await client.patch<Todo>(`/todos/${todo.id}`, {
        completed: !todo.completed,
      });
      setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));
    } catch (error) {
      setErrorMessage('Unable to update a todo');
      throw error;
    } finally {
      setLoadingId(null);
    }
  };

  //handle remove todo
  const removeTodo = async (id: number) => {
    setLoadingId(id);
    try {
      await client.delete(`/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
      throw error;
    } finally {
      setLoadingId(null);
    }
  };

  const renameTodo = async (todo: Todo) => {
    const trimmed = editValue.trim();

    if (trimmed === todo.title) {
      setEditingId(null);
      return;
    }

    if (!trimmed) {
      await removeTodo(todo.id);
      setEditingId(null);
      return;
    }

    setLoadingId(todo.id);
    try {
      const updated = await client.patch<Todo>(`/todos/${todo.id}`, {
        title: trimmed,
      });
      setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));
      setEditingId(null);
    } catch (error) {
      setErrorMessage('Unable to update a todo');
      editInputRef.current?.focus();
      throw error;
    } finally {
      setLoadingId(null);
    }
  };

  const clearCompleted = async () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    setLoadingIds(completedIds);
    try {
      await Promise.all(completedIds.map(id => client.delete(`/todos/${id}`)));
      setTodos(prev => prev.filter(t => !t.completed));
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
      throw error;
    } finally {
      setLoadingIds([]);
    }
  };

  //Toggle all todos
  const toggleAll = async () => {
    const areAllCompleted = todos.every(todo => todo.completed);
    const todosToUpdate = areAllCompleted
      ? todos
      : todos.filter(todo => !todo.completed);

    setLoadingIds(todosToUpdate.map(todo => todo.id));

    try {
      const updatedTodos = await Promise.all(
        todosToUpdate.map(todo =>
          client.patch<Todo>(`/todos/${todo.id}`, {
            completed: !areAllCompleted,
          }),
        ),
      );
      setTodos(prev =>
        prev.map(todo => updatedTodos.find(u => u.id === todo.id) ?? todo),
      );
    } catch (error) {
      setErrorMessage('Unable to update todos');
      throw error;
    } finally {
      setLoadingIds([]);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
            onClick={toggleAll}
          />

          {/* Add a todo on form submit */}
          <form>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              ref={inputRef}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTodo();
                }
              }}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {/* This is a completed todo */}
          {filteredTodos.map(todo => (
            <div
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo)}
                />
              </label>

              {editingId === todo.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    renameTodo(todo);
                  }}
                >
                  <input
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    ref={editInputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => renameTodo(todo)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                </form>
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => {
                      setEditingId(todo.id);
                      setEditValue(todo.title);
                      setTimeout(() => editInputRef.current?.focus(), 0);
                    }}
                  >
                    {todo.title}
                  </span>

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => removeTodo(todo.id)}
                  >
                    ×
                  </button>
                </>
              )}

              {/* overlay will cover the todo while it is being deleted or updated */}
              <div
                data-cy="TodoLoader"
                className={`modal overlay ${loadingId === todo.id || loadingIds.includes(todo.id) ? 'is-active' : ''}`}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && <footer className="todoapp__footer" data-cy="Footer">
          <span className="todo-count" data-cy="TodosCounter">
            {getTotalActiveTodos()}{' '}
            {getTotalActiveTodos() === 1 ? 'item' : 'items'} left
          </span>

          {/* Active link should have the 'selected' class */}
          <nav className="filter" data-cy="Filter">
            <a
              href="#/"
              className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
              data-cy="FilterLinkAll"
              onClick={() => setFilter('all')}
            >
              All
            </a>

            <a
              href="#/active"
              className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
              data-cy="FilterLinkActive"
              onClick={() => setFilter('active')}
            >
              Active
            </a>

            <a
              href="#/completed"
              className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
              data-cy="FilterLinkCompleted"
              onClick={() => setFilter('completed')}
            >
              Completed
            </a>
          </nav>

          {/* this button should be disabled if there are no completed todos */}
          <button
            type="button"
            className="todoapp__clear-completed"
            data-cy="ClearCompletedButton"
            disabled={todos.every(t => !t.completed)}
            onClick={clearCompleted}
          >
            Clear completed
          </button>
        </footer>}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${errorMessage ? '' : 'hidden'}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};
