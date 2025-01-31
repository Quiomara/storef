import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { UserService } from '../../../services/user.service';
import { CentroService } from '../../../services/centro.service'; // Importa el servicio de centros
import { User, UserBackend } from '../../../models/user.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmDeleteComponent } from '../confirm-delete/confirm-delete.component';
import { EditUserComponent } from '../edit-user/edit-user.component';

@Component({
  selector: 'app-search-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTableModule
  ],
  templateUrl: './search-user.component.html',
  styleUrls: ['./search-user.component.css'],
  providers: [UserService, CentroService] // Añade el servicio de centros
})
export class SearchUserComponent implements OnInit, AfterViewInit {
  searchForm: FormGroup;
  centros: any[] = [];
  tiposUsuario: any[] = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Instructor' },
    { id: 3, nombre: 'Almacen' }
  ];
  searchResults: User[] = [];
  filteredResults: User[] = [];
  dataSource = new MatTableDataSource<User>(this.filteredResults);
  displayedColumns: string[] = ['cedula', 'nombre', 'centroFormacion', 'email', 'telefono', 'tipoUsuario', 'acciones'];
  errores: any = {};

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  constructor(private userService: UserService, private centroService: CentroService, private fb: FormBuilder, public dialog: MatDialog) {
    this.searchForm = this.fb.group({
      nombre: [''],
      centroFormacion: [''],
      email: [''],
      cedula: ['']
    });
  }

  ngOnInit() {
    this.loadCentros();
    this.searchForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(values => {
      this.filterUsers(values);
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(
      (response: User[]) => {
        this.searchResults = response.map(user => {
          // Asignar nombre del centro de formación
          const centro = this.centros.find(c => c.cen_id === parseInt(user.centroFormacion));
          user.centroFormacion = centro ? centro.cen_nombre : 'N/A';
          return user;
        });
        this.filteredResults = this.searchResults;
        this.dataSource.data = this.filteredResults;
        this.sortUsersAlphabetically();
        this.updatePaginator();
      },
      (error: any) => {
        console.error('Error al obtener usuarios', error);
      }
    );
  }

  loadCentros(): void {
    this.centroService.getCentros().subscribe(
      (response: any) => {
        this.centros = response.data; // Ajusta esto según el formato de la respuesta
        console.log('Centros de formación obtenidos:', this.centros);
        
        // Cargar los usuarios después de cargar los centros
        this.loadUsers();
      },
      (error: any) => {
        console.error('Error al obtener centros de formación', error);
        if (error.error) {
          console.error('Detalles del error:', error.error);
        }
        if (error.message) {
          console.error('Mensaje del error:', error.message);
        }
        if (error.status) {
          console.error('Código de estado del error:', error.status);
        }
      }
    );
  }

  filterUsers(values: any): void {
    this.filteredResults = this.searchResults.filter(user => {
      const nombreCompleto = `${user.primerNombre} ${user.segundoNombre} ${user.primerApellido} ${user.segundoApellido}`.toLowerCase();
      const nombreFiltrado = values.nombre.toLowerCase();
      const centroFiltrado = this.centros.find(centro => centro.cen_id.toString() === values.centroFormacion)?.cen_nombre || '';

      return (values.nombre === '' || nombreCompleto.includes(nombreFiltrado)) &&
             (values.centroFormacion === '' || user.centroFormacion === centroFiltrado) &&
             (values.email === '' || user.email.toLowerCase().includes(values.email.toLowerCase())) &&
             (values.cedula === '' || user.cedula.toString().includes(values.cedula));
    });

    this.dataSource.data = this.filteredResults;
    this.sortUsersAlphabetically();
    this.updatePaginator();
  }

  updatePaginator(): void {
    this.dataSource.paginator = this.paginator;
    this.paginator.length = this.filteredResults.length;
  }

  sortUsersAlphabetically(): void {
    this.filteredResults.sort((a, b) => `${a.primerNombre} ${a.primerApellido}`.localeCompare(`${b.primerNombre} ${b.primerApellido}`));
  }

  onEdit(user: User): void {
    const dialogRef = this.dialog.open(EditUserComponent, {
      width: '600px',
      data: user
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const userBackend: Partial<UserBackend> = {
          usr_cedula: result.cedula,
          usr_primer_nombre: result.primerNombre,
          usr_segundo_nombre: result.segundoNombre,
          usr_primer_apellido: result.primerApellido,
          usr_segundo_apellido: result.segundoApellido,
          usr_correo: result.email,
          usr_telefono: result.telefono,
          cen_id: this.centros.find(centro => centro.cen_nombre === result.centroFormacion)?.cen_id,
          tip_usr_id: this.tiposUsuario.find(tipo => tipo.nombre === result.tipoUsuario)?.id
        };

        this.userService.updateUser(result.cedula.toString(), userBackend).subscribe(
          (response: any) => {
            this.loadUsers();
          },
          (error: any) => {
            console.error('Error al actualizar usuario', error);
          }
        );
      }
    });
  }

  onDelete(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDeleteComponent, {
      width: '400px',
      data: { user: user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.deleteUser(user.cedula.toString()).subscribe(
          (response: any) => {
            this.filteredResults = this.filteredResults.filter(u => u.cedula !== user.cedula);
            this.dataSource.data = this.filteredResults;
            this.updatePaginator();
          },
          (error: any) => {
            console.error('Error al eliminar usuario', error);
          }
        );
      }
    });
  }
}
