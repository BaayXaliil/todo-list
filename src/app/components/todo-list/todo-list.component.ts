import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Todo, Priority, Label } from '../../models/todo.model';
import { TodoModalComponent } from '../todo-modal/todo-modal.component';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ViewFilter = 'all' | 'priority' | 'today' | 'completed';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss']
})
export class TodoListComponent implements OnInit {
  readonly priorities = Object.values(Priority);
  readonly labels = Object.values(Label);

  viewFilter: ViewFilter = 'all';
  searchTerm = '';
  total = 0;
  isLoading = false;
  page = 1;
  perPage = 15;
  pagedTodos: Todo[] = [];

  private allTodos: Todo[] = [];
  private filteredTodos: Todo[] = [];
  private currentPriority: Priority | '' = '';
  private currentLabel: Label | '' = '';

  constructor(private api: ApiService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadTodos();
  }

  loadTodos(): void {
    this.isLoading = true;
    this.api.getTodos()
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe(todos => {
        this.allTodos = todos;
        this.applyFilters();
      });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(TodoModalComponent, { width: '720px', data: { mode: 'create' } });
    dialogRef.afterClosed().subscribe(res => { if (res) { this.loadTodos(); } });
  }

  onEdit(row: Todo): void {
    const dialogRef = this.dialog.open(TodoModalComponent, { width: '720px', data: { mode: 'edit', todo: row } });
    dialogRef.afterClosed().subscribe(res => { if (res) { this.loadTodos(); } });
  }

  onDelete(row: Todo): void {
    if (confirm('Supprimer cette tache ?')) {
      this.api.deleteTodo(row.id!).subscribe(() => this.loadTodos());
    }
  }

  setViewFilter(filter: ViewFilter): void {
    this.viewFilter = filter;
    this.page = 1;
    this.applyFilters();
  }

  setPriorityFilter(value: Priority | ''): void {
    this.currentPriority = value;
    this.page = 1;
    this.applyFilters();
  }

  setLabelFilter(value: Label | ''): void {
    this.currentLabel = this.currentLabel === value ? '' : value;
    this.page = 1;
    this.applyFilters();
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.page = 1;
    this.applyFilters();
  }

  resetFilters(): void {
    this.viewFilter = 'all';
    this.currentPriority = '';
    this.currentLabel = '';
    this.searchTerm = '';
    this.page = 1;
    this.applyFilters();
  }

  nextPage(): void {
    if (this.page * this.perPage >= this.total) {
      return;
    }
    this.page += 1;
    this.updatePagedTodos();
  }

  previousPage(): void {
    if (this.page === 1) {
      return;
    }
    this.page -= 1;
    this.updatePagedTodos();
  }

  applyFilters(): void {
    let filtered = [...this.allTodos];

    filtered = filtered.filter(todo => this.matchesViewFilter(todo));

    if (this.currentPriority) {
      filtered = filtered.filter(todo => todo.priority === this.currentPriority);
    }

    if (this.currentLabel) {
      filtered = filtered.filter(todo => (todo.labels ?? []).includes(this.currentLabel as Label));
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(todo => {
        const title = todo.titre?.toLowerCase() ?? '';
        const person = todo.person?.name?.toLowerCase() ?? '';
        return title.includes(term) || person.includes(term);
      });
    }

    this.filteredTodos = filtered;
    this.total = filtered.length;
    this.updatePagedTodos();
  }

  get priorityFilter(): Priority | '' {
    return this.currentPriority;
  }

  get labelFilter(): Label | '' {
    return this.currentLabel;
  }

  get pageSummary(): string {
    if (!this.total) {
      return '0 sur 0';
    }
    const start = (this.page - 1) * this.perPage + 1;
    const end = Math.min(this.page * this.perPage, this.total);
    return `${start}-${end} sur ${this.total}`;
  }

  getScheduleLabel(todo: Todo): string {
    if (!todo.startDate) {
      return 'Aucune date planifiee';
    }
    const date = new Date(todo.startDate);
    return `Planifiee pour ${date.toLocaleDateString('fr-FR', { month: 'short', day: '2-digit', year: 'numeric' })}`;
  }

  exportToExcel(): void {
    const rows = this.buildExportRows();
    if (!rows.length) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Taches');
    XLSX.writeFile(workbook, 'taches.xlsx');
  }

  exportToPdf(): void {
    const rows = this.buildExportRows();
    if (!rows.length) {
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    autoTable(doc, {
      head: [['Tache', 'Responsable', 'Priorite', 'Etiquettes', 'Debut', 'Fin', 'Description']],
      body: rows.map(row => [
        row['Tache'],
        row['Responsable'],
        row['Priorite'],
        row['Etiquettes'],
        row['Debut'],
        row['Fin'],
        row['Description']
      ]),
      styles: { fontSize: 9, cellPadding: 3 }
    });
    doc.save('taches.pdf');
  }

  getInitials(todo: Todo): string {
    const name = todo.person?.name ?? todo.titre ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return `${first}${second}`.toUpperCase();
  }

  getAvatarColor(todo: Todo): string {
    const palette = ['#6366f1', '#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ec4899'];
    const seed = todo.person?.id ?? todo.id ?? 0;
    return palette[Math.abs(seed) % palette.length];
  }

  priorityClass(priority?: Priority): string {
    if (!priority) {
      return 'priority-moyen';
    }
    return `priority-${priority.toLowerCase()}`;
  }

  getLabelColor(label: Label): string {
    switch (label) {
      case Label.HTML:
        return '#ef4444';
      case Label.CSS:
        return '#3b82f6';
      case Label.JQUERY:
        return '#facc15';
      case Label.NODEJS:
        return '#22c55e';
      default:
        return '#9ca3af';
    }
  }

  labelClass(label: Label): string {
    return `label-${label.toLowerCase().replace(/\s+/g, '-')}`;
  }

  isCompleted(todo: Todo): boolean {
    if (!todo.endDate) {
      return false;
    }
    return new Date(todo.endDate).getTime() < Date.now();
  }

  trackByTodo(_index: number, todo: Todo): number | string {
    return todo.id ?? todo.titre;
  }

  private matchesViewFilter(todo: Todo): boolean {
    switch (this.viewFilter) {
      case 'priority':
        return todo.priority === Priority.Difficile;
      case 'today':
        return this.isToday(todo.startDate);
      case 'completed':
        return this.isCompleted(todo);
      default:
        return true;
    }
  }

  private isToday(dateValue?: string): boolean {
    if (!dateValue) {
      return false;
    }
    const reference = new Date();
    const date = new Date(dateValue);
    return date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate();
  }

  private updatePagedTodos(): void {
    const totalPages = Math.max(1, Math.ceil(this.total / this.perPage));
    this.page = Math.min(this.page, totalPages);
    const start = (this.page - 1) * this.perPage;
    this.pagedTodos = this.filteredTodos.slice(start, start + this.perPage);
  }

  private buildExportRows(): Array<Record<string, string>> {
    return this.filteredTodos.map(todo => ({
      'Tache': todo.titre,
      'Responsable': todo.person?.name ?? 'Sans responsable',
      'Priorite': todo.priority ?? '',
      'Etiquettes': (todo.labels ?? []).join(', '),
      'Debut': this.formatDateForExport(todo.startDate),
      'Fin': this.formatDateForExport(todo.endDate),
      'Description': todo.description ?? ''
    }));
  }

  private formatDateForExport(value?: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('fr-FR');
  }
}
