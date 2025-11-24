import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { Todo, Priority, Label } from '../../models/todo.model';
import { Person } from '../../models/person.model';

export interface TodoModalData {
  mode: 'create' | 'edit';
  todo?: Todo;
}

@Component({
  selector: 'app-todo-modal',
  templateUrl: './todo-modal.component.html',
  styleUrls: ['./todo-modal.component.css']
})
export class TodoModalComponent implements OnInit {
  form!: FormGroup;
  priorities = Object.values(Priority);
  labels = Object.values(Label);
  persons: Person[] = [];
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private dialogRef: MatDialogRef<TodoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TodoModalData
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadPersons();
    if (this.data.mode === 'edit' && this.data.todo) {
      this.patchForm(this.data.todo);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.isSaving = true;

    const request$ = this.data.mode === 'create'
      ? this.api.createTodo(payload)
      : this.api.updateTodo(this.data.todo!.id!, payload);

    request$
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe(() => this.dialogRef.close(true));
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private buildForm(): void {
    this.form = this.fb.group({
      titre: ['', Validators.required],
      personId: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null],
      priority: [Priority.Moyen, Validators.required],
      labels: [[] as Label[]],
      description: ['']
    });
  }

  private loadPersons(): void {
    this.api.getPersons().subscribe(persons => {
      this.persons = persons;
      if (this.data.mode === 'create' && persons.length && !this.form.value.personId) {
        this.form.patchValue({ personId: persons[0].id });
      }
    });
  }

  private patchForm(todo: Todo): void {
    this.form.patchValue({
      titre: todo.titre,
      personId: todo.person?.id ?? null,
      startDate: todo.startDate ? new Date(todo.startDate) : null,
      endDate: todo.endDate ? new Date(todo.endDate) : null,
      priority: todo.priority,
      labels: todo.labels ?? [],
      description: todo.description ?? ''
    });
  }

  private buildPayload(): Todo {
    const raw = this.form.value;
    const person = this.persons.find(p => p.id === raw.personId);

    return {
      ...this.data.todo,
      titre: raw.titre,
      person: person ?? this.data.todo?.person,
      startDate: raw.startDate ? new Date(raw.startDate).toISOString() : '',
      endDate: raw.endDate ? new Date(raw.endDate).toISOString() : undefined,
      priority: raw.priority,
      labels: raw.labels ?? [],
      description: raw.description
    };
  }
}
