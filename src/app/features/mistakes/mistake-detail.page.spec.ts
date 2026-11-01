import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { mistakeDetailFixture } from '../../core/api/fixtures/phase4-contracts';
import { MistakeApiService } from '../../core/api/mistake-api.service';
import { MistakeDetailPage } from './mistake-detail.page';

describe('MistakeDetailPage', () => {
  let fixture: ComponentFixture<MistakeDetailPage>;
  let page: MistakeDetailPage;
  let mistakesApi: jasmine.SpyObj<MistakeApiService>;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function createPage(
    id: string,
    getImpl: () => ReturnType<MistakeApiService['getMistake']>,
  ): void {
    paramMap$ = new BehaviorSubject(convertToParamMap({ id }));
    mistakesApi = jasmine.createSpyObj<MistakeApiService>('MistakeApiService', [
      'listMistakes',
      'getMistake',
      'createMistake',
      'updateMistake',
    ]);
    mistakesApi.getMistake.and.callFake(getImpl);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MistakeDetailPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MistakeApiService, useValue: mistakesApi },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({ id }),
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(MistakeDetailPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads and displays mistake detail fields', () => {
    createPage('mistake-fixture-1', () => of(mistakeDetailFixture));
    expect(page.viewState()).toBe('ready');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Closures');
    expect(text).toContain('Answered incorrectly');
    expect(text).toContain('Review the topic materials');
    expect(text).toContain('Unresolved');
    expect(mistakesApi.getMistake).toHaveBeenCalledWith('mistake-fixture-1');
  });

  it('shows error state when the mistake is missing', () => {
    createPage('missing', () =>
      throwError(
        () =>
          new ApiClientError({
            statusCode: 404,
            message: 'Mistake not found',
            fromBackend: true,
          }),
      ),
    );
    expect(page.viewState()).toBe('error');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Mistake not found',
    );
  });

  it('saves edits through updateMistake', () => {
    createPage('mistake-fixture-1', () => of(mistakeDetailFixture));
    const updated = {
      status: 'ok' as const,
      mistake: {
        ...mistakeDetailFixture.mistake,
        mistakeText: 'Updated misunderstanding',
        correctUnderstanding: 'Updated correct understanding',
        turnedIntoQuestion: true,
      },
    };
    mistakesApi.updateMistake.and.returnValue(of(updated));

    page.startEditing();
    page.editMistakeText.set('Updated misunderstanding');
    page.editCorrectUnderstanding.set('Updated correct understanding');
    page.editTurnedIntoQuestion.set(true);
    page.saveEdits();
    fixture.detectChanges();

    expect(mistakesApi.updateMistake).toHaveBeenCalledWith('mistake-fixture-1', {
      mistakeText: 'Updated misunderstanding',
      correctUnderstanding: 'Updated correct understanding',
      turnedIntoQuestion: true,
    });
    expect(page.editing()).toBeFalse();
    expect(page.mistake()?.mistakeText).toBe('Updated misunderstanding');
    expect(page.actionSuccess()).toBe('Mistake updated.');
  });

  it('resolves via PATCH resolved:true and reflects resolvedAt', () => {
    createPage('mistake-fixture-1', () => of(mistakeDetailFixture));
    const resolved = {
      status: 'ok' as const,
      mistake: {
        ...mistakeDetailFixture.mistake,
        resolvedAt: '2026-10-29T12:00:00.000Z',
      },
    };
    mistakesApi.updateMistake.and.returnValue(of(resolved));

    page.resolveMistake();
    fixture.detectChanges();

    expect(mistakesApi.updateMistake).toHaveBeenCalledWith('mistake-fixture-1', {
      resolved: true,
    });
    expect(page.mistake()?.resolvedAt).toBe('2026-10-29T12:00:00.000Z');
    expect(page.actionSuccess()).toBe('Mistake marked resolved.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resolved');
  });

  it('does not claim resolve success when the API fails', () => {
    createPage('mistake-fixture-1', () => of(mistakeDetailFixture));
    mistakesApi.updateMistake.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 500,
            message: 'A server error occurred. Please try again later.',
            fromBackend: false,
          }),
      ),
    );

    page.resolveMistake();
    fixture.detectChanges();

    expect(page.mistake()?.resolvedAt).toBeNull();
    expect(page.actionSuccess()).toBeNull();
    expect(page.actionError()).toContain('server error');
  });

  it('validates edit fields before calling the API', () => {
    createPage('mistake-fixture-1', () => of(mistakeDetailFixture));
    page.startEditing();
    page.editMistakeText.set('   ');
    page.saveEdits();
    expect(mistakesApi.updateMistake).not.toHaveBeenCalled();
    expect(page.actionError()).toContain('required');
  });
});
