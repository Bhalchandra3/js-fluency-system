import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { DeepDiveApiService } from '../../core/api/deep-dive-api.service';
import {
  deepDiveNoteFixture,
  deleteDeepDiveFixture,
  listDeepDiveFixture,
} from '../../core/api/fixtures/phase4-contracts';
import { DeepDiveQueuePage } from './deep-dive-queue.page';

describe('DeepDiveQueuePage', () => {
  let fixture: ComponentFixture<DeepDiveQueuePage>;
  let page: DeepDiveQueuePage;
  let api: jasmine.SpyObj<DeepDiveApiService>;

  function createPage(
    listImpl: () => ReturnType<DeepDiveApiService['listDeepDive']>,
  ): void {
    api = jasmine.createSpyObj<DeepDiveApiService>('DeepDiveApiService', [
      'listDeepDive',
      'updateDeepDive',
      'deleteDeepDive',
    ]);
    api.listDeepDive.and.callFake(listImpl);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DeepDiveQueuePage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DeepDiveApiService, useValue: api },
      ],
    });

    fixture = TestBed.createComponent(DeepDiveQueuePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows loading while the queue request is in flight', () => {
    api = jasmine.createSpyObj<DeepDiveApiService>('DeepDiveApiService', [
      'listDeepDive',
    ]);
    api.listDeepDive.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [DeepDiveQueuePage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DeepDiveApiService, useValue: api },
      ],
    });
    fixture = TestBed.createComponent(DeepDiveQueuePage);
    page = fixture.componentInstance;
    expect(page.viewState()).toBe('loading');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Loading Deep Dive queue',
    );
  });

  it('renders queue entries with topic status and reason', () => {
    createPage(() => of(listDeepDiveFixture));
    expect(page.viewState()).toBe('ready');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Closures');
    expect(text).toContain('RED');
    expect(text).toContain('Session RESET');
    expect(text).toContain('No owner notes');
  });

  it('shows empty state when the queue has no notes', () => {
    createPage(() => of({ status: 'ok' as const, notes: [] }));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Queue is empty',
    );
  });

  it('shows error state and supports retry', () => {
    createPage(() =>
      throwError(
        () =>
          new ApiClientError({
            statusCode: 401,
            message: 'Authentication required. Please save a valid access token.',
            fromBackend: false,
          }),
      ),
    );
    expect(page.viewState()).toBe('error');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Authentication required',
    );

    api.listDeepDive.and.returnValue(of(listDeepDiveFixture));
    page.loadQueue();
    fixture.detectChanges();
    expect(page.viewState()).toBe('ready');
  });

  it('selects a note and saves reason/notes through updateDeepDive', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    fixture.detectChanges();

    api.updateDeepDive.and.returnValue(of(deepDiveNoteFixture));
    page.editReason.set('Need deeper study');
    page.editNotes.set('Owner study notes');
    page.saveEdits();
    fixture.detectChanges();

    expect(api.updateDeepDive).toHaveBeenCalledWith('topic-fixture-1', {
      reason: 'Need deeper study',
      notes: 'Owner study notes',
    });
    expect(page.selectedNote()?.notes).toBe('Owner study notes');
    expect(page.actionSuccess()).toBe('Deep Dive note saved.');
  });

  it('clears notes with notes: null without deleting the queue entry', () => {
    createPage(() => of(listDeepDiveFixture));
    const withNotes = {
      ...listDeepDiveFixture.notes[0],
      notes: 'Temporary notes',
    };
    page.notes.set([withNotes]);
    page.selectNote(withNotes);
    fixture.detectChanges();

    const cleared = {
      status: 'ok' as const,
      note: { ...withNotes, notes: null },
    };
    api.updateDeepDive.and.returnValue(of(cleared));
    page.clearNotes();
    fixture.detectChanges();

    expect(api.updateDeepDive).toHaveBeenCalledWith('topic-fixture-1', {
      notes: null,
    });
    expect(api.deleteDeepDive).not.toHaveBeenCalled();
    expect(page.selectedNote()?.notes).toBeNull();
    expect(page.actionSuccess()).toBe('Notes cleared.');
  });

  it('preserves draft notes when save fails', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    page.editNotes.set('Draft that must survive');
    api.updateDeepDive.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 500,
            message: 'A server error occurred. Please try again later.',
            fromBackend: false,
          }),
      ),
    );

    page.saveEdits();
    fixture.detectChanges();

    expect(page.editNotes()).toBe('Draft that must survive');
    expect(page.actionSuccess()).toBeNull();
    expect(page.actionError()).toContain('server error');
    expect(page.selectedNote()?.notes).toBeNull();
  });

  it('blocks duplicate save while a request is in flight', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    page.editReason.set('Valid reason');
    page.editNotes.set('notes');
    api.updateDeepDive.and.returnValue(NEVER);

    page.saveEdits();
    page.saveEdits();
    expect(api.updateDeepDive).toHaveBeenCalledTimes(1);
  });

  it('removes a note from the queue via deleteDeepDive', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    api.deleteDeepDive.and.returnValue(of(deleteDeepDiveFixture));

    page.removeFromQueue();
    fixture.detectChanges();

    expect(api.deleteDeepDive).toHaveBeenCalledWith('topic-fixture-1');
    expect(page.notes().length).toBe(0);
    expect(page.selectedTopicId()).toBeNull();
    expect(page.actionSuccess()).toBe('Removed from Deep Dive queue.');
  });

  it('does not claim remove success when delete fails', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    api.deleteDeepDive.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 404,
            message: 'Deep Dive note not found',
            fromBackend: true,
          }),
      ),
    );

    page.removeFromQueue();
    fixture.detectChanges();

    expect(page.notes().length).toBe(1);
    expect(page.selectedTopicId()).toBe('topic-fixture-1');
    expect(page.actionSuccess()).toBeNull();
    expect(page.actionError()).toBe('Deep Dive note not found');
  });

  it('rejects empty reason before calling the API', () => {
    createPage(() => of(listDeepDiveFixture));
    page.selectNote(listDeepDiveFixture.notes[0]);
    page.editReason.set('   ');
    page.saveEdits();
    expect(api.updateDeepDive).not.toHaveBeenCalled();
    expect(page.actionError()).toContain('non-empty');
  });
});
