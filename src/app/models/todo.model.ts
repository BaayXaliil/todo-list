import { Person } from './person.model';

export enum Priority {
    Facile = 'Facile',
    Moyen = 'Moyen',
    Difficile = 'Difficile'
}

export enum Label {
    HTML = 'HTML',
    CSS = 'CSS',
    NODEJS = 'NODE JS',
    JQUERY = 'JQUERY'
}

export interface Todo {
    id?: number;
    titre: string;
    person: Person;
    startDate: string; // ISO date string
    endDate?: string;  // ISO date string
    priority: Priority;
    labels: Label[];
    description?: string;
}
