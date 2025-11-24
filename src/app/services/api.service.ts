import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Todo } from '../models/todo.model';
import { Person } from '../models/person.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private base = 'http://localhost:3000';

    constructor(private http: HttpClient) { }

    // Todos
    getTodos(params?: any): Observable<Todo[]> {
        return this.http.get<Todo[]>(`${this.base}/todos`, { params });
    }
    getTodo(id: number): Observable<Todo> {
        return this.http.get<Todo>(`${this.base}/todos/${id}`);
    }
    createTodo(todo: Todo): Observable<Todo> {
        return this.http.post<Todo>(`${this.base}/todos`, todo);
    }
    updateTodo(id: number, todo: Todo): Observable<Todo> {
        return this.http.put<Todo>(`${this.base}/todos/${id}`, todo);
    }
    deleteTodo(id: number): Observable<any> {
        return this.http.delete(`${this.base}/todos/${id}`);
    }

    // Persons
    getPersons(): Observable<Person[]> {
        return this.http.get<Person[]>(`${this.base}/persons`);
    }
    createPerson(person: Person): Observable<Person> {
        return this.http.post<Person>(`${this.base}/persons`, person);
    }
}
